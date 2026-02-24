import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import {
  Box, Button, CircularProgress, useTheme, Typography,
  Paper, Fade, Dialog, DialogTitle, DialogContent, IconButton,
  Backdrop // <-- added for progress overlay
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./InterviewPrepOpenAI.css";
import { useSession } from '../../../../context/SessionContext';
import { useInterviewSetup } from '../../../../context/InterviewSetupContext';
import { useAuth } from '../../../../context/AuthContext';
import api, { subscriptionService, analyticsService } from "../../../../services/api";
import SessionTimer from "../../../common/SessionTimer";
import SessionAnalytics from "../../../dashboard/SessionAnalytics"; // adjust path if needed

const RTC_CONFIGURATION = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Reconnect every 15 minutes to stay safe within the 30m limit
const RECONNECT_INTERVAL_MS = 15 * 60 * 1000;

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
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [dbSessionId, setDbSessionId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);

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

  // Data tracking refs for event handling
  const questionRef = useRef("");
  const answersRef = useRef("");
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  // --- 1. SYNC STATUS TO PARENT ---
  useEffect(() => {
    if (onConnectionStatusChange) onConnectionStatusChange(connectStatus);
  }, [connectStatus, onConnectionStatusChange]);

  // --- 2. USAGE HEARTBEAT (Every 1 min) ---
  useEffect(() => {
    let interval = null;
    if (connectStatus === "connected" && dbSessionId) {
      interval = setInterval(() => {
        // console.log("💓 Sending session heartbeat (1 min usage)");
        subscriptionService.recordUsage("INTERVIEW_PREP", 1, dbSessionId.toString())
          .catch(err => console.error("Heartbeat failed", err));
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [connectStatus, dbSessionId]);

  // --- 3. PROACTIVE RECONNECT TIMER (Every 15 mins) ---
  useEffect(() => {
    let timer = null;
    if (connectStatus === "connected") {
      timer = setInterval(() => {
        // console.log("♻️ Triggering proactive silent context-aware reconnect...");
        performSilentReconnect();
      }, RECONNECT_INTERVAL_MS);
    }
    return () => clearInterval(timer);
  }, [connectStatus]);

  // --- 4. UI HELPERS ---
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

  // --- 5. CORE CONNECTION LOGIC ---

  const injectHistoryContext = (channel) => {
    if (!chatHistory || chatHistory.length === 0) return;

    // Convert existing chat history into a string for the AI's instructions
    const historyText = chatHistory.map(h =>
      `Interviewer: ${h.question}\nCandidate: ${h.answer}`
    ).join("\n\n");

    const updateEvent = {
      type: "session.update",
      session: {
        instructions: `CONTINUATION CONTEXT: You are in the middle of a mock interview. 
            The conversation history so far is as follows:\n${historyText}\n
            Please continue exactly from where we left off. Do not repeat previous questions. 
            Acknowledge that we are continuing if the user has just finished an answer.`
      }
    };

    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify(updateEvent));
      // console.log("🧠 Context injected into new connection");
    }
  };

  const connectToAI = async (isSilentReconnect = false) => {
    if (isSilentReconnect) setIsReconnecting(true);

    try {
      const response = await api.post('/Realtime/session', {
        jobDescription: formData.jobDescription,
        jobTitle: formData.jobRole,
        interviewRound: formData.interviewRound,
        interviewType: "interview-prep"
      });
      const result = response.data;

      if (result.data.sessionId) {
        // console.log(`📡 ${isSilentReconnect ? 'Reconnected' : 'Started'} with Session ID:`, result.data.sessionId);

        // CRITICAL FIX: Always update the Session ID, even on reconnects
        setDbSessionId(result.data.sessionId);

        if (!isSilentReconnect) {
          setStartTime(new Date());
        }
      }

      const newPC = new RTCPeerConnection(RTC_CONFIGURATION);

      // Use existing stream from ref
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
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
        if (isSilentReconnect) {
          injectHistoryContext(newDC);
        }
      };

      const offer = await newPC.createOffer({ offerToReceiveAudio: true });
      await newPC.setLocalDescription(offer);

      const baseUrl = "https://ks-ai-gpt-realtime-resource.openai.azure.com/openai/v1/realtime?model=realtime";
      const sdpResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${result.data.clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      if (!sdpResponse.ok) throw new Error("SDP Exchange failed");

      const answerSdp = await sdpResponse.text();
      await newPC.setRemoteDescription({ type: "answer", sdp: answerSdp });

      if (isSilentReconnect) {
        // Silent Swap
        if (pcRef.current) pcRef.current.close();
        pcRef.current = newPC;
        dcRef.current = newDC;
        setIsReconnecting(false);
        // console.log("✅ Silent Handover Complete.");
      } else {
        // Initial Connect
        pcRef.current = newPC;
        dcRef.current = newDC;
        setConnectStatus("connected");
        setActiveStopSession(() => disconnectWebSocket);
        clearForm();
      }

    } catch (err) {
      console.error("Connection failed:", err);
      if (!isSilentReconnect) setConnectStatus("notConnect");
      setIsReconnecting(false);
    }
  };

  const startSession = async () => {
    try {
      setConnectStatus("connecting");
      setShowWelcome(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      visualize(stream);
      await connectToAI(false);

    } catch (error) {
      console.error("Media Error:", error);
      setConnectStatus("notConnect");
      setShowWelcome(true);
    }
  };

  const performSilentReconnect = () => {
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      connectToAI(true);
    } else {
      console.warn("Media stream lost, cannot reconnect.");
      disconnectWebSocket();
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

  // --- MODIFIED: disconnectWebSocket now shows progress and polls for analytics ---
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
    setIsReconnecting(false);

    if (sessionIdToAnalyze) {
      try {
        setProgressOpen(true);
        const transcriptPayload = chatHistory.map(e => ({ question: e.answer, answer: e.question }));
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

  // --- 6. EVENT HANDLERS ---
  const handleDone = () => {
    const q = questionRef.current;
    const a = answersRef.current;
    if (q || a) {
      setChatHistory(prev => [...prev, {
        question: q,
        answer: a,
        timestamp: new Date().toISOString()
      }]);
    }
    setAnswers('');
    setQuestion('');
    questionRef.current = "";
    answersRef.current = "";
  };

  const handleOpenAIEvent = (event) => {
    const message = JSON.parse(event.data);
    const { type } = message;
    console.log("Message: ", message);
    if (type === 'error' && message.error?.code === 'session_expired') {
      performSilentReconnect();
      return;
    }
    switch (type) {
      case "response.output_audio_transcript.delta":
        console.log("Delta: ", message);
        setAnswers(prev => {
          const updated = prev + (message.delta || "");
          answersRef.current = updated;
          return updated;
        });
        break;
      case "response.output_item.done":
        handleDone();
        break;
      case "conversation.item.input_audio_transcription.completed":
        console.log("Completed: ", message);
        const transcript = message.transcript || "";
        setQuestion(transcript);
        questionRef.current = transcript;
        break;
      default: break;
    }
  };

  // --- 7. VISUALIZER ---
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

        <Fade in={isReconnecting}>
          <Box sx={{
            position: 'absolute', top: 20, left: 20, bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white', px: 2, py: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, zIndex: 20
          }}>
            <CircularProgress size={16} color="inherit" />
            <Typography variant="caption">Refreshing AI context...</Typography>
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