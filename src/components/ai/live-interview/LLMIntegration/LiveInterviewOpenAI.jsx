import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Box, Button, Typography, Fade, CircularProgress } from "@mui/material";
import "./LiveInterviewOpenAI.css";
import { useSession } from "../../../../context/SessionContext";
import { useInterviewSetup } from '../../../../context/InterviewSetupContext';
import { useAuth } from "../../../../context/AuthContext";
import api, { subscriptionService } from "../../../../services/api";
import SessionTimer from "../../../common/SessionTimer";

const RTC_CONFIGURATION = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Reconnect interval in milliseconds (15 minutes to be safe within the 30m limit)
const RECONNECT_INTERVAL_MS = 15 * 60 * 1000;

const LiveInterviewOpenAI = forwardRef(({
  answers,
  question,
  setQuestion,
  setAnswers,
  chatHistory,
  setChatHistory,
  formData,
  onConnectionStatusChange,
  isFullscreen
}, ref) => {

  // --- 1. HOOKS & CONTEXT ---
  const { user, refreshUsage } = useAuth(); // FIXED: Destructured refreshUsage
  const { setActiveStopSession } = useSession();
  const { clearForm } = useInterviewSetup();

  // --- 2. STATE ---
  const [connectStatus, setConnectStatus] = useState("notConnect");
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isSharing, setIsSharing] = useState(false); // FIXED: Added missing state

  const [dbSessionId, setDbSessionId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [outputText, setOutputText] = useState("");
  const [inputText, setInputText] = useState("");

  // --- 3. REFS ---
  // Active connection objects
  const pcRef = useRef(null);
  const dcRef = useRef(null);

  // Persistent Media Stream (Screen Share)
  const mediaStreamRef = useRef(null);

  // Data Refs for event handling
  const questionRef = useRef(""); // FIXED: Added missing ref
  const answersRef = useRef("");
  const wakeLockRef = useRef(null);
  const videoRef = useRef(null);

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
        // console.log("💓 Sending session heartbeat (1 min usage)");
        subscriptionService.recordUsage("LIVE_INTERVIEW", 1, dbSessionId.toString())
          .catch(e => console.error("Heartbeat fail", e));
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [connectStatus, dbSessionId]);

  // Proactive Silent Reconnect (Every 15 mins)
  useEffect(() => {
    let timer = null;
    if (connectStatus === "connected") {
      // console.log(`⏱️ Auto-reconnect timer set for ${RECONNECT_INTERVAL_MS / 60000} mins`);
      timer = setInterval(() => {
        // console.log("♻️ Triggering proactive silent reconnect...");
        performSilentReconnect();
      }, RECONNECT_INTERVAL_MS);
    }
    return () => clearInterval(timer);
  }, [connectStatus]);

  // Cleanup on Unmount
  useEffect(() => {
    return () => {
      // Force cleanup if component unmounts
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

  // --- 6. CORE LOGIC ---

  const startCapture = async () => {
    try {
      setConnectStatus("connecting");

      // Request screen share ONLY ONCE
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      mediaStreamRef.current = stream;
      setIsSharing(true);

      // Handle user clicking "Stop Sharing" on browser UI
      stream.getVideoTracks()[0].onended = () => {
        // console.log("User stopped screen sharing via browser UI");
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
      setConnectStatus("notConnect");
      setIsSharing(false);
    }
  };

  const connectToAI = async (isSilentReconnect = false) => {
    if (isSilentReconnect) setIsReconnecting(true);

    try {
      // A. Get Ephemeral Token from Backend
      const response = await api.post('/Realtime/session', {
        jobDescription: formData.jobDescription,
        cvText: formData.cv,
        jobTitle: formData.jobRole,
        interviewRound: formData.interviewRound,
        interviewType: "live-interview"
      });
      const secretDict = response.data;

      // Only set DB Session ID on first connect (not reconnects)
      if (!isSilentReconnect && secretDict.data.sessionId) {
        setDbSessionId(secretDict.data.sessionId);
        setStartTime(new Date());
      }

      // B. Create NEW Peer Connection
      const newPC = new RTCPeerConnection(RTC_CONFIGURATION);

      // C. Attach EXISTING Stream Tracks to New PC
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          newPC.addTrack(track, mediaStreamRef.current);
        });
      }

      // D. Setup Audio Output
      newPC.ontrack = (e) => {
        // const audioEl = new Audio();
        // audioEl.srcObject = e.streams[0];
        // audioEl.play().catch(e => console.error("Audio play error", e));
      };

      // E. Data Channel & Events
      const newDataChannel = newPC.createDataChannel("oai-events", { ordered: true });
      newDataChannel.onmessage = handleOpenAIEvent;

      // F. SDP Handshake
      const offer = await newPC.createOffer();
      await newPC.setLocalDescription(offer);

      const baseUrl = "https://ks-ai-gpt-realtime-resource.openai.azure.com/openai/v1/realtime?model=realtime";
      const sdpResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretDict.data.clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      if (!sdpResponse.ok) throw new Error("SDP Exchange failed");

      const answerSdp = await sdpResponse.text();
      await newPC.setRemoteDescription({ type: "answer", sdp: answerSdp });

      // G. HANDOVER LOGIC
      if (isSilentReconnect) {
        // console.log("🔀 Handover: Switching to new connection...");

        // Close OLD connection refs
        if (pcRef.current) pcRef.current.close();
        if (dcRef.current) dcRef.current.close();

        // Swap Refs
        pcRef.current = newPC;
        dcRef.current = newDataChannel;

        setIsReconnecting(false);
        // console.log("✅ Handover complete. Stream maintained.");
      } else {
        // First time setup
        pcRef.current = newPC;
        dcRef.current = newDataChannel;
        setConnectStatus("connected");
        setActiveStopSession(() => fullDisconnect());
        clearForm();
      }

    } catch (err) {
      console.error("Connection failed:", err);
      if (!isSilentReconnect) setConnectStatus("notConnect");
      setIsReconnecting(false);
    }
  };

  const performSilentReconnect = () => {
    // Verify we still have a stream before trying
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      connectToAI(true);
    } else {
      console.warn("Cannot reconnect: Media stream is dead.");
      fullDisconnect();
    }
  };

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
        // console.log(`Stopping session ${dbSessionId}...`);
        await subscriptionService.stopSession(dbSessionId, 0);

        // FIXED: refreshUsage is now properly defined from useAuth
        if (refreshUsage) await refreshUsage();
      } catch (e) { console.error(e); }
      setDbSessionId(null);
    }

    setConnectStatus("notConnect");
    setIsReconnecting(false);

    // Reset UI state
    setAnswers("");
    setQuestion("");
    setIsSharing(false); // FIXED: properly defined in useState
    setChatHistory([]);
    setActiveStopSession(null);
  };

  const handleLimitReached = () => {
    alert("You have reached your session time limit for this plan.");
    fullDisconnect();
  };

  // --- 7. EVENT HANDLERS ---
  const handleDone = () => {
    const questionSnapshot = questionRef.current; // FIXED: properly defined in useRef
    const answerSnapshot = answersRef.current;

    if (questionSnapshot || answerSnapshot) {
      setChatHistory(prev => [
        ...prev,
        {
          question: questionSnapshot,
          answer: answerSnapshot,
          timestamp: new Date().toISOString()
        }
      ]);
    }

    setInputText('');
    setOutputText('');
    setAnswers('');
    setQuestion('');
    questionRef.current = ""; // Reset ref
    answersRef.current = ""; // Reset ref
  };

  const handleOpenAIEvent = async (event) => {
    const message = JSON.parse(event.data);
    const { type } = message;

    // Handle Session Expired Error (Backup for the timer)
    if (message.type === 'error' && message.error?.code === 'session_expired') {
      // console.warn("⚠️ Received session_expired from API. Triggering immediate reconnect.");
      performSilentReconnect();
      return;
    }

    switch (type) {
      case "response.output_audio_transcript.delta":
        try {
          setOutputText(prev => {
            const newText = prev + (message.delta || "");
            setAnswers(newText);
            answersRef.current = newText;
            return newText;
          });
        } catch (error) {
          console.error("Error handling transcript delta:", error);
        }
        break;

      case "response.output_item.done":
        handleDone();
        break;

      case "conversation.item.input_audio_transcription.completed":
        try {
          setInputText(prev => {
            const newText = prev + (message.transcript || "");
            setQuestion(newText);
            questionRef.current = newText; // FIXED: properly defined in useRef
            return newText;
          });
        } catch (error) {
          console.error("Error handling transcript delta:", error);
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

        {/* Reconnecting Indicator */}
        <Fade in={isReconnecting}>
          <Box sx={{
            position: 'absolute', top: 20, right: 20,
            bgcolor: 'rgba(0,0,0,0.7)', color: 'white',
            px: 2, py: 1, borderRadius: 2,
            display: 'flex', alignItems: 'center', gap: 1, zIndex: 10
          }}>
            <CircularProgress size={16} color="inherit" />
            <Typography variant="caption">Refreshing Connection...</Typography>
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