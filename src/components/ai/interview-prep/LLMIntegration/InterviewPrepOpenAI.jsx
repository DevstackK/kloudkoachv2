import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import {
  Box, Button, CircularProgress, useTheme, Typography,
  Paper, Fade, Dialog, DialogTitle, DialogContent, IconButton,
  Backdrop
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./InterviewPrepOpenAI.css";
import { useSession } from '../../../../context/SessionContext';
import { useInterviewSetup } from '../../../../context/InterviewSetupContext';
import { useAuth } from '../../../../context/AuthContext';
import api, { subscriptionService, analyticsService, realtimeService } from "../../../../services/api";
import SessionTimer from "../../../common/SessionTimer";
import SessionAnalytics from "../../../dashboard/SessionAnalytics";
import useRealtimeReconnect from "../../../../hooks/useRealtimeReconnect";

const RTC_CONFIGURATION = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const InterviewPrepOpenAI = forwardRef(({
  answers,
  question,
  setQuestion,
  setAnswers,
  chatHistory,
  setChatHistory,
  formData,
  onConnectionStatusChange
}, ref) => {

  const { refreshUsage } = useAuth();
  const theme = useTheme();
  const { setActiveStopSession } = useSession();
  const { clearForm } = useInterviewSetup();

  // --- STATE ---
  const [connectStatus, setConnectStatus] = useState("notConnect");
  const [dbSessionId, setDbSessionId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);

  // Dynamic reconnect interval from backend's MaxDurationMinutes
  const [reconnectIntervalMs, setReconnectIntervalMs] = useState(null);

  // --- State for analytics modal ---
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsSessionId, setAnalyticsSessionId] = useState(null);

  // --- State for progress overlay (while generating analytics) ---
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  // Refs for WebRTC Connection Objects
  const pcRef = useRef(null);
  const dcRef = useRef(null);

  // Persistent Microphone Stream Ref
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

  // Data tracking refs for event handling
  const questionRef = useRef("");
  const answersRef = useRef("");
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  // Track conversation item IDs for accurate truncation
  const conversationItemIdsRef = useRef([]);

  // Session start timestamp for relative timing in logs
  const sessionStartTimeRef = useRef(null);

  // --- 1. SYNC STATUS TO PARENT ---
  useEffect(() => {
    if (onConnectionStatusChange) onConnectionStatusChange(connectStatus);
  }, [connectStatus, onConnectionStatusChange]);

  // --- 2. USAGE HEARTBEAT (Every 1 min) ---
  useEffect(() => {
    let interval = null;
    if (connectStatus === "connected" && dbSessionId) {
      interval = setInterval(() => {
        subscriptionService.recordUsage("INTERVIEW_PREP", 1, dbSessionId.toString())
          .catch(err => console.error("Heartbeat failed", err));
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [connectStatus, dbSessionId]);

  // --- 3. UI HELPERS ---
  const refreshStatusButtonUI = () => {
    if (connectStatus === "notConnect") return "Start Session";
    if (connectStatus === "connecting") return "Connecting...";
    if (connectStatus === "connected") return "Stop Session";
    return "Start Session";
  };

  const handleLimitReached = () => {
    alert("You have reached your session time limit for this plan.");
    disconnectWebSocket();
  };

  // --- 4. CONTEXT INJECTION ---

  const injectHistoryContext = (channel) => {
    const history = chatHistoryRef.current;
    if (!history || history.length === 0) return;

    console.log(`[InterviewPrep] 💉 Injecting ${history.length} items into conversation history`);

    if (channel && channel.readyState === "open") {
      history.forEach((h, index) => {
        // 1. Inject AI Question (Assistant)
        const assistantEvent = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: h.answer }]
          }
        };
        channel.send(JSON.stringify(assistantEvent));

        // 2. Inject User Answer (User)
        const userEvent = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: h.question }]
          }
        };
        channel.send(JSON.stringify(userEvent));
      });

      console.log("[InterviewPrep] ✅ History context injected via conversation.item.create");
    }
  };

  // --- 5. CORE CONNECTION LOGIC ---

  const attemptReconnectRef = useRef(null);

  const connectToAI = useCallback(async (isSilentReconnect = false) => {
    const t0 = Date.now();
    console.log(`[InterviewPrep] 🔌 connectToAI called (silent=${isSilentReconnect}, sessionId=${dbSessionIdRef.current})`);

    try {
      let result;

      if (isSilentReconnect && dbSessionIdRef.current) {
        console.log(`[InterviewPrep] → Calling /refresh for session ${dbSessionIdRef.current}`);
        const currentFormData = formDataRef.current;
        const response = await realtimeService.refreshSession(dbSessionIdRef.current, {
          jobDescription: currentFormData.jobDescription,
          jobTitle: currentFormData.jobRole,
          interviewRound: currentFormData.interviewRound,
          interviewType: "interview-prep"
        });
        result = response.data;
        console.log(`[InterviewPrep] ← /refresh OK (${Date.now() - t0}ms)`, result.data?.sessionId);
      } else {
        const currentFormData = formDataRef.current;
        console.log('[InterviewPrep] → Calling /session (initial)', { jobTitle: currentFormData.jobRole });
        const response = await realtimeService.createSession({
          jobDescription: currentFormData.jobDescription,
          jobTitle: currentFormData.jobRole,
          interviewRound: currentFormData.interviewRound,
          interviewType: "interview-prep"
        });
        result = response.data;
        console.log(`[InterviewPrep] ← /session OK (${Date.now() - t0}ms)`, result.data?.sessionId);
      }

      // Update Session ID and dynamic reconnect interval
      if (result.data.sessionId) {
        setDbSessionId(result.data.sessionId);
        dbSessionIdRef.current = result.data.sessionId;

        if (!isSilentReconnect) {
          setStartTime(new Date());
          sessionStartTimeRef.current = Date.now();
        }
      }

      // Use backend-provided MaxDurationMinutes for reconnect timer
      if (result.data.maxDurationMinutes) {
        const safeMs = (result.data.maxDurationMinutes - 2) * 60 * 1000;
        setReconnectIntervalMs(safeMs);
        console.log(`[InterviewPrep] ⏰ MaxDurationMinutes=${result.data.maxDurationMinutes} → reconnect at ${(safeMs / 60000).toFixed(1)} min`);
      }

      // Clear tracked item IDs on reconnect
      if (isSilentReconnect) {
        conversationItemIdsRef.current = [];
        console.log('[InterviewPrep] 🗑️ Cleared conversation item tracker for new session');
      }

      const newPC = new RTCPeerConnection(RTC_CONFIGURATION);

      // Log PC state changes
      // Log PC state changes and trap drops
      newPC.onconnectionstatechange = () => {
        console.log(`[InterviewPrep] 📡 PC connectionState: ${newPC.connectionState}`);
        if (newPC.connectionState === 'disconnected' || newPC.connectionState === 'failed') {
          console.warn(`[InterviewPrep] 🚨 PeerConnection dropped (${newPC.connectionState}) — triggering silent reconnect`);
          if (attemptReconnectRef.current) attemptReconnectRef.current(0);
        }
      };
      newPC.oniceconnectionstatechange = () => {
        console.log(`[InterviewPrep] 🧊 PC iceConnectionState: ${newPC.iceConnectionState}`);
        if (newPC.iceConnectionState === 'disconnected' || newPC.iceConnectionState === 'failed') {
          console.warn(`[InterviewPrep] 🚨 ICE Connection dropped (${newPC.iceConnectionState}) — triggering silent reconnect`);
          if (attemptReconnectRef.current) attemptReconnectRef.current(0);
        }
      };

      // Use existing stream from ref
      if (mediaStreamRef.current) {
        const tracks = mediaStreamRef.current.getTracks();
        console.log(`[InterviewPrep] 🎙️ Attaching ${tracks.length} tracks to new PC`);
        tracks.forEach(track => {
          newPC.addTrack(track, mediaStreamRef.current);
        });
      }

      newPC.ontrack = (e) => {
        const audioEl = new Audio();
        audioEl.srcObject = e.streams[0];
        audioEl.play().catch(err => console.error("Audio play error", err));
      };

      const newDC = newPC.createDataChannel("oai-events", { ordered: true });
      newDC.onmessage = handleOpenAIEvent;

      newDC.onopen = () => {
        const elapsed = Date.now() - t0;
        console.log(`[InterviewPrep] 📨 DataChannel OPEN (${elapsed}ms from connectToAI start)`);


        if (isSilentReconnect) {
          // --- SEAMLESS SWAP ON OPEN ---
          if (pcRef.current) {
            console.log(`[InterviewPrep] 🔌 Swapping to new PeerConnection (Handover at ${elapsed}ms)`);
            pcRef.current.close();
          }
          pcRef.current = newPC;
          dcRef.current = newDC;

          injectHistoryContext(newDC);
          console.log(`[InterviewPrep] ✅ Seamless silent reconnect complete (${Date.now() - t0}ms total)`);
        }
      };

      newDC.onclose = () => {
        console.warn('[InterviewPrep] 📨 DataChannel CLOSED');
      };

      newDC.onerror = (err) => {
        console.error('[InterviewPrep] 📨 DataChannel ERROR:', err);
      };

      const offer = await newPC.createOffer({ offerToReceiveAudio: true });
      await newPC.setLocalDescription(offer);

      // --- OPTIMIZATION: Wait for ICE gathering (max 1s) ---
      if (newPC.iceGatheringState !== 'complete') {
        console.log("[InterviewPrep] ⏳ Waiting for ICE gathering...");
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
          }, 1000);
        });
      }

      const baseUrl = "https://info-mqpcgdu1-eastus2.cognitiveservices.azure.com/openai/v1/realtime?model=gptrealtime";
      console.log(`[InterviewPrep] → Sending SDP offer (${Date.now() - t0}ms)`);
      const sdpResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${result.data.clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: newPC.localDescription.sdp
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error(`[InterviewPrep] ❌ SDP Exchange failed: ${sdpResponse.status}`, errorText);
        throw new Error(`SDP Exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await newPC.setRemoteDescription({ type: "answer", sdp: answerSdp });
      console.log(`[InterviewPrep] ← SDP answer received (${Date.now() - t0}ms total)`);

      if (!isSilentReconnect) {
        pcRef.current = newPC;
        dcRef.current = newDC;
        setConnectStatus("connected");
        setActiveStopSession(() => disconnectWebSocket);
        clearForm();
        console.log(`[InterviewPrep] ✅ Initial connection complete (${Date.now() - t0}ms total)`);
      }

    } catch (err) {
      console.error(`[InterviewPrep] ❌ Connection failed (${Date.now() - t0}ms):`, err?.response?.status, err?.response?.data || err.message);
      if (!isSilentReconnect) setConnectStatus("notConnect");
      throw err;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Deps are intentionally empty — we use refs for all mutable values

  // --- 6. RECONNECT HOOK (replaces manual setInterval) ---

  const { isReconnecting, reconnectAttempt, attemptReconnect } = useRealtimeReconnect({
    connectToAI,
    connectStatus,
    mediaStreamRef,
    dcRef,
    reconnectIntervalMs,
    conversationItemIdsRef,
    onAllRetriesFailed: () => {
      console.error("[InterviewPrep] 💀 All reconnect retries failed — disconnecting");
      disconnectWebSocket();
    }
  });

  useEffect(() => {
    attemptReconnectRef.current = attemptReconnect;
  }, [attemptReconnect]);

  const startSession = async () => {
    try {
      setConnectStatus("connecting");
      setShowWelcome(false);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,      // Mono is usually better for speech recognition
          sampleRate: 16000     // Matches Whisper/Realtime API preferred rate
        } 
      });
      mediaStreamRef.current = stream;

      visualize(stream);
      await connectToAI(false);

    } catch (error) {
      console.error("Media Error:", error);
      if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
        alert("Microphone access was denied. Please allow permissions in your browser and try again.");
      } else {
        alert("Failed to access microphone. Please check your system settings.");
      }
      setConnectStatus("notConnect");
      setShowWelcome(true);
    }
  };

  // --- Polling function to wait for analytics to be ready ---
  const pollAnalytics = useCallback(async (sessionId) => {
    const maxAttempts = 80; // 4 minutes with 3s interval
    const intervalMs = 3000;
    let attempts = 0;

    setProgressMessage("Generating personalized analytics... This may take 2-4 minutes depending on interview length.");

    while (attempts < maxAttempts) {
      try {
        const response = await analyticsService.getSessionAnalytics(sessionId);
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          // Data ready
          setProgressOpen(false);
          setAnalyticsSessionId(sessionId);
          setAnalyticsOpen(true);
          return;
        }
      } catch (err) {
        // Ignore errors, continue polling
        console.log("Polling error, retrying...", err);
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    // Timeout – show dialog anyway with a warning
    setProgressOpen(false);
    setAnalyticsSessionId(sessionId);
    setAnalyticsOpen(true);
    alert("Analytics generation is taking longer than expected. You can view them later in your history.");
  }, []);

  // --- DISCONNECT ---
  const disconnectWebSocket = async () => {
    // Store sessionId before cleanup
    const sessionIdToAnalyze = dbSessionId;

    // Close WebRTC and stop tracks
    if (pcRef.current) pcRef.current.close();
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());

    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    if (audioContextRef.current) audioContextRef.current.close();

    // Reset component state immediately (UI goes back to start)
    setConnectStatus("notConnect");
    setDbSessionId(null);
    setAnswers("");
    setQuestion("");
    setChatHistory([]);
    setActiveStopSession(null);
    setShowWelcome(true);

    if (sessionIdToAnalyze) {
      try {
        setProgressOpen(true);
        const transcriptPayload = chatHistoryRef.current.map(e => ({ question: e.answer, answer: e.question }));
        await subscriptionService.stopSession(sessionIdToAnalyze, 0, transcriptPayload);
        if (refreshUsage) refreshUsage();

        // Show progress overlay and start polling for analytics
        await pollAnalytics(sessionIdToAnalyze);

      } catch (e) {
        console.error("Failed to stop session", e);
        // Still attempt to show analytics (maybe from cache)
        setProgressOpen(false);
        setAnalyticsSessionId(sessionIdToAnalyze);
        setAnalyticsOpen(true);
      }
    }
  };

  // --- 7. EVENT HANDLERS ---
  const handleDone = () => {
    const q = questionRef.current;
    const a = answersRef.current;
    if (q || a) {
      setChatHistory(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question: q,
          answer: a,
          timestamp: new Date().toISOString()
        }
      ]);
    }
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
      // Don't spam console with every audio/transcript delta
    } else if (type === 'error') {
      if (message.error?.code === 'response_cancel_not_active') {
        // Benign error: We told the AI to stop talking when we started speaking, but it wasn't talking anyway.
        return; 
      }
      console.error(`[InterviewPrep] [${elapsed}] ❌ EVENT: ${type}`, message.error);
    } else {
      console.log(`[InterviewPrep] [${elapsed}] 📩 EVENT: ${type}`, message);
    }

    // --- Track conversation item IDs for truncation ---
    if (type === 'conversation.item.created' && message.item?.id) {
      conversationItemIdsRef.current.push(message.item.id);
      console.log(`[InterviewPrep] [${elapsed}] 📋 Tracked item: ${message.item.id} (total: ${conversationItemIdsRef.current.length})`);
    }

    // --- Handle Critical Server Errors ---
    if (type === 'error') {
      const errCode = message.error?.code;
      // Reconnect silently if token expired or rate limited
      if (errCode === 'session_expired' || errCode === 'rate_limit_exceeded' || message.error?.message?.toLowerCase().includes('token')) {
        console.warn(`[InterviewPrep] [${elapsed}] ⚠️ Tolerable Error (${errCode}) — triggering reconnect`);
        attemptReconnect(0);
        return;
      }
      // Hard crash on content filtering or out of quota
      if (errCode === 'insufficient_quota' || errCode === 'content_filter_violation') {
        alert(`Session error: ${errCode}. Please try again later.`);
        disconnectWebSocket();
        return;
      }
    }

    // --- Handle response cancellation ---
    if (type === 'response.cancelled') {
      console.warn(`[InterviewPrep] [${elapsed}] ⚠️ Response was CANCELLED by server`);
    }

    // --- Graceful Interruption ---
    if (type === 'input_audio_buffer.speech_started') {
      if (dcRef.current?.readyState === 'open') {
        dcRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      }
    }

    switch (type) {
      case "response.output_audio_transcript.delta":
        setAnswers(prev => {
          const updated = prev + (message.delta || "");
          answersRef.current = updated;
          return updated;
        });
        break;
      case "response.output_item.done":
        console.log(`[InterviewPrep] [${elapsed}] ✅ Response complete — saving to chat history`);
        handleDone();
        break;
      case "response.done": // FINAL safety fallback
        console.log(`[InterviewPrep] [${elapsed}] 🏁 Response DONE`, message.response);

        // Trap silence timeouts where the model decided not to speak (e.g. paused user input)
        if (message.response?.status === "failed" && message.response?.status_details?.error?.code === "first_output_timeout") {
          console.warn(`[InterviewPrep] [${elapsed}] ⏳ Ignored first_output_timeout (user likely paused/stuttered). Continuing to listen...`);
          
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
            setQuestion('');
            questionRef.current = "";
          }
          // Stop here so we don't finalize an empty turn
          break;
        }
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const transcript = message.transcript || "";
        console.log(`[InterviewPrep] [${elapsed}] 🎤 User transcription: "${transcript.substring(0, 80)}..."`);
        queueMicrotask(() => setQuestion(transcript)); // Fix React warning
        questionRef.current = transcript;
        break;
      }
      case "session.created":
        console.log(`[InterviewPrep] [${elapsed}] 🟢 Session CREATED by server`);
        break;
      case "session.updated":
        console.log(`[InterviewPrep] [${elapsed}] 🔄 Session UPDATED by server`);
        break;
      default: break;
    }
  };

  // --- 8. VISUALIZER ---
  const visualize = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      if (!canvasRef.current) return;
      animationFrameIdRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 30;

      for (let i = 0; i < dataArray.length * 0.7; i++) {
        const barHeight = dataArray[i] / 2.5;
        const angle = (i / (dataArray.length * 0.7)) * 2 * Math.PI;
        ctx.strokeStyle = theme.palette.primary.main;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
        ctx.lineTo(centerX + (radius + barHeight) * Math.cos(angle), centerY + (radius + barHeight) * Math.sin(angle));
        ctx.stroke();
      }
    };
    draw();
  };

  useImperativeHandle(ref, () => ({ stopSession: disconnectWebSocket }));

  // Resize canvas effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [showWelcome]);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={2} height={"720px"}>
      <Box className="video-container" sx={{
        width: "100%", height: "100%", display: "flex", alignItems: "center",
        justifyContent: "center", overflow: "hidden", borderRadius: 2,
        backgroundColor: 'background.paper', position: 'relative'
      }}>
        {showWelcome && connectStatus === "notConnect" && (
          <Paper elevation={3} sx={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center',
            bgcolor: 'primary.light', color: 'primary.contrastText', border: 2, borderColor: 'primary.main', zIndex: 10
          }}>
            <Typography variant="h5" fontWeight="bold">🎤 Ready to Start!</Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>Click "Start Session" to begin your mock interview.</Typography>
          </Paper>
        )}

        {!showWelcome && (
          <canvas ref={canvasRef} width="100%" height="100%" style={{ opacity: connectStatus === "connected" ? 1 : 0.5 }} />
        )}

        {/* Reconnecting Indicator — now shows retry attempt count */}
        <Fade in={isReconnecting}>
          <Box sx={{
            position: 'absolute', top: 20, left: 20, bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white', px: 2, py: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, zIndex: 20
          }}>
            <CircularProgress size={16} color="inherit" />
            <Typography variant="caption">
              Refreshing AI context...{reconnectAttempt > 1 ? ` (Attempt ${reconnectAttempt})` : ''}
            </Typography>
          </Box>
        </Fade>

        {connectStatus === "connected" && startTime && (
          <SessionTimer startTime={startTime} isActive={true} featureCode="INTERVIEW_PREP" onLimitReached={handleLimitReached} />
        )}
      </Box>

      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        {connectStatus === "connected" && <Typography variant="caption" color="text.secondary">Listening...</Typography>}
        <Button
          variant="contained"
          color="primary"
          onClick={connectStatus === "connected" ? disconnectWebSocket : startSession}
          disabled={connectStatus === "connecting"}
          size="large"
        >
          {connectStatus === "connecting" ? <CircularProgress size={20} color="inherit" /> : refreshStatusButtonUI()}
        </Button>
      </Box>

      {/* Progress Overlay (full screen) */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column', gap: 2 }}
        open={progressOpen}
      >
        <CircularProgress color="inherit" size={60} />
        <Typography variant="h6" align="center" sx={{ maxWidth: 400, px: 2 }}>
          {progressMessage}
        </Typography>
      </Backdrop>

      {/* Analytics Modal */}
      <Dialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          Session Results
          <IconButton
            aria-label="close"
            onClick={() => setAnalyticsOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {analyticsSessionId && (
            <SessionAnalytics sessionIdProp={analyticsSessionId} onClose={() => setAnalyticsOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
});

export default InterviewPrepOpenAI;