import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import { Box, Button, Typography, Fade, CircularProgress } from "@mui/material";
import "./LiveInterviewOpenAI.css";
import { useSession } from "../../../../context/SessionContext";
import { useInterviewSetup } from '../../../../context/InterviewSetupContext';
import { useAuth } from "../../../../context/AuthContext";
import api, { subscriptionService, realtimeService } from "../../../../services/api";
import SessionTimer from "../../../common/SessionTimer";
import useRealtimeReconnect from "../../../../hooks/useRealtimeReconnect";

const RTC_CONFIGURATION = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const LiveInterviewOpenAI = forwardRef(({
  answers,
  question,
  setQuestion,
  setAnswers,
  chatHistory,
  setChatHistory,
  formData,
  onConnectionStatusChange,
  isFullscreen,
  setTurnStatus
}, ref) => {

  // --- 1. HOOKS & CONTEXT ---
  const { user, refreshUsage } = useAuth();
  const { setActiveStopSession } = useSession();
  const { clearForm } = useInterviewSetup();

  // --- 2. STATE ---
  const [connectStatus, setConnectStatus] = useState("notConnect");
  const [isSharing, setIsSharing] = useState(false);

  const [dbSessionId, setDbSessionId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [outputText, setOutputText] = useState("");
  const [inputText, setInputText] = useState("");

  // Dynamic reconnect interval from backend's MaxDurationMinutes
  const [reconnectIntervalMs, setReconnectIntervalMs] = useState(null);

  // --- 3. REFS ---
  // Active connection objects
  const pcRef = useRef(null);
  const dcRef = useRef(null);

  // Persistent Media Stream (Screen Share)
  const mediaStreamRef = useRef(null);

  // Ref to access dbSessionId in reconnect without stale closures
  const dbSessionIdRef = useRef(null);

  // FIX: Preserve formData across clearForm() calls so reconnect has valid data
  const formDataRef = useRef(formData);
  useEffect(() => {
    if (formData) formDataRef.current = formData;
  }, [formData]);

  // Preserve chatHistory in a ref for context injection on reconnect
  const chatHistoryRef = useRef(chatHistory);
  useEffect(() => {
    chatHistoryRef.current = chatHistory;
  }, [chatHistory]);

  // Data Refs for event handling
  const questionRef = useRef("");
  const answersRef = useRef("");
  const wakeLockRef = useRef(null);
  const videoRef = useRef(null);

  // Track conversation item IDs for accurate truncation
  const conversationItemIdsRef = useRef([]);

  // Session start timestamp for relative timing in logs
  const sessionStartTimeRef = useRef(null);

  // --- 4. EFFECTS ---

  // Sync status to parent
  useEffect(() => {
    if (onConnectionStatusChange) onConnectionStatusChange(connectStatus);
  }, [connectStatus, onConnectionStatusChange]);

  // Usage Heartbeat (Every 1 min)
  useEffect(() => {
    let interval = null;
    if (connectStatus === "connected" && dbSessionId) {
      interval = setInterval(() => {
        subscriptionService.recordUsage("LIVE_INTERVIEW", 1, dbSessionId.toString())
          .catch(e => console.error("Heartbeat fail", e));
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [connectStatus, dbSessionId]);

  // Cleanup on Unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      releaseWakeLock();
    };
  }, []);

  // --- 5. HELPER FUNCTIONS ---

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn(`Wake Lock unavailable: ${err.message}`);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error('Error releasing wake lock', err);
      }
    }
  };

  const refreshStatusButtonUI = () => {
    if (connectStatus === "notConnect") return "Start Session";
    if (connectStatus === "connecting") return "Connecting...";
    if (connectStatus === "connected") return "Stop";
  };

  // --- 6. CONTEXT INJECTION (NEW — ported from InterviewPrepOpenAI) ---

  // --- 6. CONTEXT INJECTION (Disabled for Live Interview — managed by backend) ---

  const injectHistoryContext = (channel) => {
    // Disabled as backend instructions provide sufficient context.
    console.log("[LiveInterview] ℹ️ Skipping history injection (managed by backend)");
  };

  // --- 7. CORE CONNECTION LOGIC ---

  const attemptReconnectRef = useRef(null);

  const connectToAI = useCallback(async (isSilentReconnect = false) => {
    const t0 = Date.now();
    console.log(`[LiveInterview] 🔌 connectToAI called (silent=${isSilentReconnect}, sessionId=${dbSessionIdRef.current})`);

    try {
      let secretDict;

      if (isSilentReconnect && dbSessionIdRef.current) {
        console.log(`[LiveInterview] → Calling /refresh for session ${dbSessionIdRef.current}`);
        const currentFormData = formDataRef.current;
        const response = await realtimeService.refreshSession(dbSessionIdRef.current, {
          jobDescription: currentFormData.jobDescription,
          cvText: currentFormData.cv,
          jobTitle: currentFormData.jobRole,
          interviewRound: currentFormData.interviewRound,
          interviewType: "live-interview"
        });
        secretDict = response.data;
        console.log(`[LiveInterview] ← /refresh OK (${Date.now() - t0}ms)`, secretDict.data?.sessionId);
      } else {
        const currentFormData = formDataRef.current;
        console.log('[LiveInterview] → Calling /session (initial)', { jobTitle: currentFormData.jobRole });
        const response = await realtimeService.createSession({
          jobDescription: currentFormData.jobDescription,
          cvText: currentFormData.cv,
          jobTitle: currentFormData.jobRole,
          interviewRound: currentFormData.interviewRound,
          interviewType: "live-interview"
        });
        secretDict = response.data;
        console.log(`[LiveInterview] ← /session OK (${Date.now() - t0}ms)`, secretDict.data?.sessionId);
      }

      // Update Session ID and dynamic reconnect interval
      if (secretDict.data.sessionId) {
        setDbSessionId(secretDict.data.sessionId);
        dbSessionIdRef.current = secretDict.data.sessionId;

        if (!isSilentReconnect) {
          setStartTime(new Date());
          sessionStartTimeRef.current = Date.now();
        }
      }

      // Use backend-provided MaxDurationMinutes for reconnect timer
      if (secretDict.data.maxDurationMinutes) {
        const safeMs = (secretDict.data.maxDurationMinutes - 2) * 60 * 1000;
        setReconnectIntervalMs(safeMs);
        console.log(`[LiveInterview] ⏰ MaxDurationMinutes=${secretDict.data.maxDurationMinutes} → reconnect at ${(safeMs / 60000).toFixed(1)} min`);
      }

      // Clear tracked item IDs on reconnect (new session = new conversation)
      if (isSilentReconnect) {
        conversationItemIdsRef.current = [];
        console.log('[LiveInterview] 🗑️ Cleared conversation item tracker for new session');
      }

      // B. Create NEW Peer Connection
      const newPC = new RTCPeerConnection(RTC_CONFIGURATION);

      // Log PC state changes for debugging
      // Log PC state changes for debugging and trap network drops
      newPC.onconnectionstatechange = () => {
        console.log(`[LiveInterview] 📡 PC connectionState: ${newPC.connectionState}`);
        if (newPC.connectionState === 'disconnected' || newPC.connectionState === 'failed') {
          console.warn(`[LiveInterview] 🚨 PeerConnection dropped (${newPC.connectionState}) — triggering silent reconnect`);
          if (attemptReconnectRef.current) attemptReconnectRef.current(0);
        }
      };
      newPC.oniceconnectionstatechange = () => {
        console.log(`[LiveInterview] 🧊 PC iceConnectionState: ${newPC.iceConnectionState}`);
        if (newPC.iceConnectionState === 'disconnected' || newPC.iceConnectionState === 'failed') {
          console.warn(`[LiveInterview] 🚨 ICE Connection dropped (${newPC.iceConnectionState}) — triggering silent reconnect`);
          if (attemptReconnectRef.current) attemptReconnectRef.current(0);
        }
      };

      // C. Attach EXISTING Stream Tracks to New PC
      if (mediaStreamRef.current) {
        const tracks = mediaStreamRef.current.getTracks();
        console.log(`[LiveInterview] 🎙️ Attaching ${tracks.length} tracks to new PC`);
        tracks.forEach(track => {
          newPC.addTrack(track, mediaStreamRef.current);
        });
      }

      // D. Data Channel & Events
      const newDataChannel = newPC.createDataChannel("oai-events", { ordered: true });
      newDataChannel.onmessage = handleOpenAIEvent;

      newDataChannel.onopen = () => {
        const elapsed = Date.now() - t0;
        console.log(`[LiveInterview] 📨 DataChannel OPEN (${elapsed}ms from connectToAI start)`);


        if (isSilentReconnect) {
          // --- SEAMLESS SWAP ON OPEN ---
          if (pcRef.current) {
            console.log(`[LiveInterview] 🔌 Swapping to new PeerConnection (Handover at ${elapsed}ms)`);
            pcRef.current.close();
          }
          pcRef.current = newPC;
          dcRef.current = newDataChannel;

          injectHistoryContext(newDataChannel);
          console.log(`[LiveInterview] ✅ Seamless silent reconnect complete (${Date.now() - t0}ms total)`);

          // --- FIX: Flush stuck UI state to history on reconnect ---
          const qSnap = questionRef.current;
          const aSnap = answersRef.current;
          if (qSnap || aSnap) {
            setChatHistory(prev => {
              const updated = [...prev, {
                id: crypto.randomUUID(),
                question: qSnap,
                answer: aSnap || "",
                timestamp: new Date().toISOString()
              }];
              return updated.slice(-10);
            });
          }
          setInputText('');
          setOutputText('');
          setAnswers('');
          setQuestion('');
          questionRef.current = "";
          answersRef.current = "";
          if (setTurnStatus) queueMicrotask(() => setTurnStatus(""));
        }
      };

      newDataChannel.onclose = () => {
        console.warn('[LiveInterview] 📨 DataChannel CLOSED');
      };

      newDataChannel.onerror = (err) => {
        console.error('[LiveInterview] 📨 DataChannel ERROR:', err);
      };

      // E. SDP Handshake
      const offer = await newPC.createOffer();
      await newPC.setLocalDescription(offer);

      // --- OPTIMIZATION: Wait for ICE gathering (max 1s) ---
      // This ensures the offer has valid candidates, making the connection faster.
      if (newPC.iceGatheringState !== 'complete') {
        console.log("[LiveInterview] ⏳ Waiting for ICE gathering...");
        await new Promise(resolve => {
          const check = () => {
            if (newPC.iceGatheringState === 'complete') {
              newPC.removeEventListener('icecandidate', check);
              resolve();
            }
          };
          newPC.addEventListener('icecandidate', check);
          setTimeout(() => {
            newPC.removeEventListener('icecandidate', check);
            resolve();
          }, 1000); // 1s max wait
        });
      }

      const baseUrl = "https://info-mqpcgdu1-eastus2.cognitiveservices.azure.com/openai/v1/realtime?model=gptrealtime";
      console.log(`[LiveInterview] → Sending SDP offer (${Date.now() - t0}ms)`);
      const sdpResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretDict.data.clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: newPC.localDescription.sdp
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error(`[LiveInterview] ❌ SDP Exchange failed: ${sdpResponse.status}`, errorText);
        throw new Error(`SDP Exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await newPC.setRemoteDescription({ type: "answer", sdp: answerSdp });
      console.log(`[LiveInterview] ← SDP answer received (${Date.now() - t0}ms total)`);

      if (!isSilentReconnect) {
        pcRef.current = newPC;
        dcRef.current = newDataChannel;
        setConnectStatus("connected");
        setActiveStopSession(() => fullDisconnect);
        clearForm();
        console.log(`[LiveInterview] ✅ Initial connection complete (${Date.now() - t0}ms total)`);
      }

    } catch (err) {
      console.error(`[LiveInterview] ❌ Connection failed (${Date.now() - t0}ms):`, err?.response?.status, err?.response?.data || err.message);
      if (!isSilentReconnect) setConnectStatus("notConnect");
      throw err;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Deps are intentionally empty — we use refs for all mutable values

  // --- 8. RECONNECT HOOK ---

  const { isReconnecting, reconnectAttempt, attemptReconnect } = useRealtimeReconnect({
    connectToAI,
    connectStatus,
    mediaStreamRef,
    dcRef,
    reconnectIntervalMs,
    conversationItemIdsRef,
    onAllRetriesFailed: () => {
      console.error("[LiveInterview] 💀 All reconnect retries failed — disconnecting");
      fullDisconnect();
    }
  });

  useEffect(() => {
    attemptReconnectRef.current = attemptReconnect;
  }, [attemptReconnect]);

  // --- 9. SESSION START ---

  const startCapture = async () => {
    try {
      setConnectStatus("connecting");

      // Request screen share ONLY ONCE
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        // Apply the same noise reduction constraints to the system/tab audio being shared
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });
      mediaStreamRef.current = stream;
      setIsSharing(true);

      // Handle user clicking "Stop Sharing" on browser UI
      stream.getVideoTracks()[0].onended = () => {
        fullDisconnect();
      };

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      await requestWakeLock();

      // Initial Connection
      await connectToAI(false);

    } catch (error) {
      console.error("Media Error:", error);
      if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
        alert("Microphone or Screen Recording access was denied. Please allow permissions in your browser and try again.");
      } else {
        alert("Failed to access media devices. Please check your system settings.");
      }
      setConnectStatus("notConnect");
      setIsSharing(false);
    }
  };

  // --- 10. DISCONNECT ---

  const fullDisconnect = async () => {
    await releaseWakeLock();

    // Close PC
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop Media Tracks (Kill screen share)
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    // Stop Backend Session
    if (dbSessionId) {
      try {
        await subscriptionService.stopSession(dbSessionId, 0);
        if (refreshUsage) await refreshUsage();
      } catch (e) { console.error(e); }
      setDbSessionId(null);
    }

    setConnectStatus("notConnect");

    // Reset UI state
    setAnswers("");
    setQuestion("");
    setIsSharing(false);
    setChatHistory([]);
    setActiveStopSession(null);
  };

  const handleLimitReached = () => {
    alert("You have reached your session time limit for this plan.");
    fullDisconnect();
  };

  // --- 11. EVENT HANDLERS ---
  const handleDone = () => {
    const questionSnapshot = questionRef.current;
    const answerSnapshot = answersRef.current;

    if (questionSnapshot || answerSnapshot) {
      setChatHistory(prev => {
        const updated = [
          ...prev,
          {
            id: crypto.randomUUID(),
            question: questionSnapshot,
            // If answer is empty, still save the question so it shows up
            answer: answerSnapshot || "",
            timestamp: new Date().toISOString()
          }
        ];

        // Keep only the last 10 chat entries
        return updated.slice(-10);
      });
    }

    setInputText('');
    setOutputText('');
    setAnswers('');
    setQuestion('');
    questionRef.current = "";
    answersRef.current = "";
  };

  const handleOpenAIEvent = (event) => {
    const message = JSON.parse(event.data);
    const { type } = message;

    // Calculate elapsed time for logs
    const elapsed = sessionStartTimeRef.current
      ? `+${((Date.now() - sessionStartTimeRef.current) / 1000).toFixed(0)}s`
      : '';

    // --- LOG ALL EVENT TYPES ---
    if (type === 'response.output_audio_transcript.delta' ||
      type === 'response.audio.delta' ||
      type === 'response.text.delta') {
      // Don't spam console
    } else if (type === 'error') {
      if (message.error?.code === 'response_cancel_not_active') {
        // Benign error: We told the AI to stop talking when we started speaking, but it wasn't talking anyway.
        return;
      }
      console.error(`[LiveInterview] [${elapsed}] ❌ EVENT: ${type}`, message.error);
    } else {
      console.log(`[LiveInterview] [${elapsed}] 📩 EVENT: ${type}`, message);
    }

    // --- Track conversation item IDs ---
    if (type === 'conversation.item.created' && message.item?.id) {
      conversationItemIdsRef.current.push(message.item.id);
    }

    // --- Handle Critical Server Errors ---
    if (type === 'error') {
      const errCode = message.error?.code;
      // Reconnect silently if token expired or rate limited
      if (errCode === 'session_expired' || errCode === 'rate_limit_exceeded' || message.error?.message?.toLowerCase().includes('token')) {
        console.warn(`[LiveInterview] [${elapsed}] ⚠️ Tolerable Error (${errCode}) — triggering reconnect`);
        attemptReconnect(0);
        return;
      }
      // Hard crash on content filtering or out of quota
      if (errCode === 'insufficient_quota' || errCode === 'content_filter_violation') {
        alert(`Session error: ${errCode}. Please try again later.`);
        fullDisconnect();
        return;
      }
    }

    // --- Internal State Management (turnStatus) ---
    // Update the parent's turnStatus based on OpenAI events
    // FIX: Using queueMicrotask directly prevents React from warning about
    // "Cannot update a component while rendering a different component"
    if (type === 'input_audio_buffer.speech_started') {
      queueMicrotask(() => setTurnStatus("speaking"));
      // [NEW] Graceful Interruption: if AI is talking, tell it to stop immediately
      if (dcRef.current?.readyState === 'open') {
        // Send cancel instruction to backend Azure OpenAI
        dcRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      }
    } else if (type === 'input_audio_buffer.speech_stopped' || type === 'input_audio_buffer.committed') {
      queueMicrotask(() => setTurnStatus("thinking"));
    } else if (type === 'response.created') {
      queueMicrotask(() => setTurnStatus("thinking"));
    } else if (type === 'response.output_audio_transcript.delta' || type === 'response.text.delta') {
      queueMicrotask(() => setTurnStatus("responding"));
    }

    switch (type) {
      case "response.output_audio_transcript.delta":
      case "response.text.delta": // Support for text-only responses
        try {
          const delta = message.delta || (message.content?.[0]?.text) || "";
          setOutputText(prev => {
            const newText = prev + delta;
            setAnswers(newText);
            answersRef.current = newText;
            return newText;
          });
        } catch (error) {
          console.error("Error handling delta:", error);
        }
        break;

      case "response.output_item.done":
        console.log(`[LiveInterview] [${elapsed}] ✅ Response item done`);
        break;

      case "response.done": // FINAL safety fallback
        console.log(`[LiveInterview] [${elapsed}] 🏁 Response DONE — finalizing turn`, message.response);

        // Trap silence timeouts where the model decided not to speak (e.g. paused user input)
        // If the response failed due to timeout, ignore it and keep listening instead of finalizing the turn
        if (message.response?.status === "failed" && message.response?.status_details?.error?.code === "first_output_timeout") {
          console.warn(`[LiveInterview] [${elapsed}] ⏳ Ignored first_output_timeout (user likely paused/stuttered). Continuing to listen...`);
          queueMicrotask(() => setTurnStatus(""));

          // Fix: Flush the partial transcript so it doesn't "bundle" up on the next turn
          const qSnap = questionRef.current;
          if (qSnap) {
            setChatHistory(prev => {
              const updated = [...prev, {
                id: crypto.randomUUID(),
                question: qSnap,
                answer: "",
                timestamp: new Date().toISOString()
              }];
              return updated.slice(-10);
            });
            setInputText('');
            setQuestion('');
            questionRef.current = "";
          }
          break;
        }

        queueMicrotask(() => setTurnStatus("")); // Reset status

        // Always finalize the turn to ensure the question gets pushed to history,
        // even if the AI didn't generate an answer (e.g. voice activity without content)
        handleDone();
        break;

      case "response.cancelled":
        console.warn(`[LiveInterview] [${elapsed}] ⚠️ Response CANCELLED`);
        queueMicrotask(() => setTurnStatus(""));
        break;

      case "conversation.item.input_audio_transcription.completed":
        try {
          const transcript = message.transcript || "";
          console.log(`[LiveInterview] [${elapsed}] 🎤 User transcription: "${transcript.substring(0, 80)}..."`);
          setInputText(prev => {
            // Ensure proper spacing between fragmented sentences
            const separator = (prev && !prev.endsWith(' ') && !transcript.startsWith(' ')) ? ' ' : '';
            const newText = prev + separator + transcript;
            queueMicrotask(() => setQuestion(newText)); // Fix React warning
            questionRef.current = newText;
            return newText;
          });
        } catch (error) {
          console.error("Error handling transcript:", error);
        }
        break;

      default:
        break;
    }
  };

  useImperativeHandle(ref, () => ({
    stopSession: fullDisconnect,
  }));

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={isFullscreen ? 0 : 2} height="100%">
      <Box className="video-container" sx={{
        width: "100%", height: "100%", display: "flex", alignItems: "center",
        justifyContent: "center", overflow: "hidden", borderRadius: isFullscreen ? 0 : 2,
        backgroundColor: "#000", position: "relative"
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video-element"
          style={{
            objectFit: isFullscreen ? "cover" : "contain",
            width: "100%", height: "100%",
            borderRadius: isFullscreen ? 0 : "12px"
          }}
        />

        {/* Reconnecting Indicator — now shows retry attempt count */}
        <Fade in={isReconnecting}>
          <Box sx={{
            position: 'absolute', top: 20, right: 20,
            bgcolor: 'rgba(0,0,0,0.7)', color: 'white',
            px: 2, py: 1, borderRadius: 2,
            display: 'flex', alignItems: 'center', gap: 1, zIndex: 10
          }}>
            <CircularProgress size={16} color="inherit" />
            <Typography variant="caption">
              Refreshing Connection...{reconnectAttempt > 1 ? ` (Attempt ${reconnectAttempt})` : ''}
            </Typography>
          </Box>
        </Fade>
      </Box>

      {/* Controls */}
      {connectStatus === "connected" ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          {connectStatus === 'connected' && <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Listening...</Typography>}

          {startTime && (
            <SessionTimer
              startTime={startTime}
              isActive={true}
              featureCode="LIVE_INTERVIEW"
              onLimitReached={handleLimitReached}
            />
          )}

          <Button variant="contained" color="primary" onClick={fullDisconnect}>
            Stop Session
          </Button>
        </Box>
      ) : (
        <Button variant="contained" color="primary" onClick={startCapture} disabled={connectStatus === "connecting"}>
          {refreshStatusButtonUI()}
        </Button>
      )}
    </Box>
  );
});

export default LiveInterviewOpenAI;