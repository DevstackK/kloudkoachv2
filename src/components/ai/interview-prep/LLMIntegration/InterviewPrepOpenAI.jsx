import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Box, Button, CircularProgress, useTheme, Typography, Paper } from "@mui/material";
import "./InterviewPrepOpenAI.css";
import { useSession } from '../../../../context/SessionContext';
import { useInterviewSetup } from '../../../../context/InterviewSetupContext';
import { useAuth } from '../../../../context/AuthContext';
import api, { subscriptionService } from "../../../../services/api"; // Import API
import SessionTimer from "../../../common/SessionTimer"; // Import Timer

const OPENAI_KEY=process.env.REACT_APP_OPENAI_API_KEY;

const RTC_CONFIGURATION = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
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

  const { user, refreshUsage } = useAuth();
  const [listeningOnMic, setListening] = useState(false);
  const [connectStatus, setConnectStatus] = useState("notConnect");
  const [peerConnection, setPeerConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [outputText, setOutputText] = useState("");
  const [inputText, setInputText] = useState("");

  const [dbSessionId, setDbSessionId] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const theme = useTheme();
  const localStreamRef = useRef(null);
  const questionRef = useRef("");
  const answersRef = useRef("");

  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState(null);

  // Refs for audio visualization
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const { setActiveStopSession } = useSession();
  const { clearForm } = useInterviewSetup();

  // New state for welcome message
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (onConnectionStatusChange) {
      onConnectionStatusChange(connectStatus);
    }
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

    return () => {
      window.removeEventListener("resize", resizeCanvas);

      if (peerConnection) {
        console.log("Component unmounting, stopping session...");
        disconnectWebSocket();
      }
    };
  }, [peerConnection, onConnectionStatusChange]);

  // Hide welcome message when session starts
  useEffect(() => {
    if (connectStatus === "connecting" || connectStatus === "connected") {
      setShowWelcome(false);
    }
  }, [connectStatus]);

  // Show welcome message when component is first created
  useEffect(() => {
    setShowWelcome(true);
  }, []);

  const refreshStatusButtonUI = () => {
    if (connectStatus === "notConnect") return "Start Session";
    if (connectStatus === "connecting") return "Connecting...";
    if (connectStatus === "connected") return "Stop";
  };

  const refreshListeningStatus = () => {
    return connectStatus === "connected";
  }

  const stopSharing = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);
  };

  // Get Secret Key from OpenAI API - UPDATED to use backend session endpoint
  const getOpenAIWebSocketSecretKey = async () => {
    const response = await api.post('/Realtime/session', {
        jobDescription: formData.jobDescription,
        jobTitle: formData.jobRole,
        interviewRound: formData.interviewRound,
        interviewType: "interview-prep",
        company: "",
        industry: "", 
        experienceLevel: ""
    });

    // Axios returns data in response.data. The wrapper is { success: true, data: {...} }
    const result = response.data;
    
    if (!result.success) {
       throw new Error(result.error || "Failed to create session");
    }

    if (result.data.sessionId) {
        setDbSessionId(result.data.sessionId);
        setStartTime(new Date()); // Start timer locally
    }
    if (result.data.sessionId) {
        console.log("Session ID received:", result.data.sessionId); // Debug Log
        setDbSessionId(result.data.sessionId);
        setStartTime(new Date()); // Start timer locally
    } else {
        console.warn("⚠️ No Session ID returned from backend!", result);
    }
    return result;
  };

  // Function to draw the audio visualizer
  const visualize = (stream) => {
    if (!stream || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    source.connect(analyser);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");

    const draw = () => {
      animationFrameIdRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 30;
      const bars = bufferLength * 0.7;

      for (let i = 0; i < bars; i++) {
        const barHeight = dataArray[i] / 2.5;
        const angle = (i / bars) * 2 * Math.PI;

        const startX = centerX + radius * Math.cos(angle);
        const startY = centerY + radius * Math.sin(angle);

        const endX = centerX + (radius + barHeight) * Math.cos(angle);
        const endY = centerY + (radius + barHeight) * Math.sin(angle);

        canvasCtx.strokeStyle = theme.palette.primary.main;
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        canvasCtx.moveTo(startX, startY);
        canvasCtx.lineTo(endX, endY);
        canvasCtx.stroke();
      }
    };

    draw();
  };

  // Connect to WebRTC and OpenAI
  const connectWebSocket = async () => {
    if (connectStatus !== "notConnect") {
      return;
    }
    setConnectStatus("connecting");
    setListening(refreshListeningStatus());

    try {
      // 1. Get WebSocket key from backend
      const secretDict = await getOpenAIWebSocketSecretKey();

      // 2. Init RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      console.log("1. Init RTCPeerConnection");

      // 3. Setup local audio
      console.log("2. Setup local audio");
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(localStream);
      setIsSharing(true);
      if (!localStream || localStream.getTracks().length === 0) {
        console.error("No audio tracks found in the local stream");
        setConnectStatus("notConnect");
        setListening(refreshListeningStatus());
        return;
      }

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      localStreamRef.current = localStream;

      // Start visualization
      visualize(localStream);

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          const audioElement = new Audio();
          audioElement.srcObject = event.streams[0];
          audioElement.play().catch((error) => console.error('Audio play error:', error));
        }
      };

      // 4. Create data channel
      console.log("3. Create data channel");
      const channel = pc.createDataChannel("oai-events", { ordered: true });
      channel.onopen = () => {
        console.log("Data channel is open");
        setDataChannel(channel);
      };

      channel.onmessage = (event) => {
        handleOpenAIEvent(event);
      };

      setPeerConnection(pc);
      setDataChannel(channel);

      // 5. Create SDP Offer
      console.log("4. Create SDP Offer");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      if (!offer.sdp || !offer.sdp.includes("m=audio")) {
        setConnectStatus("notConnect");
        setListening(refreshListeningStatus());
        return;
      }

      // 6. Set Local Description
      console.log("5. Set Local Description");
      await pc.setLocalDescription(new RTCSessionDescription(offer));

      // 7. Send SDP to OpenAI
      console.log("6. Send SDP to OpenAI");
      const clientSecret = secretDict?.data?.clientSecret;
      if (clientSecret) {
        await sendSDPToServer(pc, offer, clientSecret);
        setConnectStatus("connected");
        setListening(refreshListeningStatus());
        setActiveStopSession(() => disconnectWebSocket);
        clearForm();
      } else {
        console.error("Client secret is missing");
        setConnectStatus("notConnect");
        setListening(refreshListeningStatus());
      }
    } catch (error) {
      console.error("Connection error:", error);
      setConnectStatus("notConnect");
      setListening(refreshListeningStatus());
    }
  };

  // Send SDP to service
  const sendSDPToServer = async (pc, offer, clientSecret) => {
    const url = "https://ks-ai-gpt-realtime-resource.openai.azure.com/openai/v1/realtime?model=realtime";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    });

    if (!response.ok) {
      throw new Error(`Failed to send SDP to server: ${response.statusText}`);
    }

    const remoteSDP = await response.text();
    await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: remoteSDP }));
  };

  const handleDone = () => {
    const questionSnapshot = questionRef.current;
    const answerSnapshot = answersRef.current;
    setChatHistory(prev => [
      ...prev,
      {
        question: questionSnapshot,
        answer: answerSnapshot,
        timestamp: new Date().toISOString()
      }
    ]);
    setInputText('');
    setOutputText('');
    setAnswers('');
    setQuestion('');
  };  

  // Handle OpenAI Event
  const handleOpenAIEvent = async (event) => {
    const message = JSON.parse(event.data);
    const { type } = message;
    console.log(message);
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
          setAnswers("Error processing transcript");
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
            questionRef.current = newText;
            return newText;
          });
        } catch (error) {
          console.error("Error handling transcript delta:", error);
          setQuestion("Error processing transcript");
        }
        break;
      case "session.updated":
        console.log("Session updated:", message.session);
        break;
      case "session.created":
        console.log("Session created");
        break;
      default:
        break;
    }
  };

  // Disconnect WebRTC
  const disconnectWebSocket = async () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      console.log("Disconnecting peer connection");
    }
    if (dataChannel) {
      dataChannel.close();
      setDataChannel(null);
      console.log("Disconnecting data channel");
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      console.log("Disconnecting local audio stream");
    }
    
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      console.log("Disconnecting audio visualization");
    }
    
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed' && audioContextRef.current.state !== 'closing') {
          audioContextRef.current.close();
          console.log("AudioContext closed successfully");
        } else {
          console.log("AudioContext already closed or closing");
        }
      } catch (error) {
        console.warn("Error closing AudioContext:", error);
      }
      audioContextRef.current = null;
      // if (dbSessionId) {
      //   try {
      //       await subscriptionService.stopSession(dbSessionId, 0);
      //       await refreshUsage();
      //   } catch(e) { console.error(e); }
      // }
      //   setDbSessionId(null);
      if (dbSessionId) {
        try {
            console.log(`Stopping session ${dbSessionId}...`);
            
            // Format chat history for backend
            // chatHistory is likely [{question: "...", answer: "...", timestamp: "..."}]
            const transcriptPayload = chatHistory.map(entry => ({
                question: entry.answer,
                answer: entry.question
            }));

            // Include transcript in the API call
            await subscriptionService.stopSession(dbSessionId, 0, transcriptPayload);
            
            await refreshUsage(); 
        } catch (error) {
            console.error("Failed to stop session on backend", error);
        }
        setDbSessionId(null);
    }
    }
    
    setConnectStatus("notConnect");
    setListening(refreshListeningStatus());
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      console.log("Disconnecting media streams");
    }
    setIsSharing(false);
    setOutputText("");
    setAnswers("");
    setQuestion("");
    setInputText("");
    setChatHistory([]);
    setActiveStopSession(null);
    // Show welcome message again when session stops
    setShowWelcome(true);
  };

  const handleLimitReached = () => {
      alert("Session time limit reached.");
      disconnectWebSocket();
  };

  useImperativeHandle(ref, () => ({
    stopSession: disconnectWebSocket,
  }));

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={2} height={"720px"}>
      <Box
        className="video-container"
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 2,
          backgroundColor: 'background.paper',
          position: 'relative',
        }}
      >
        {/* Welcome Message - Shows when no session is active */}
        {showWelcome && connectStatus === "notConnect" && (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              textAlign: 'center',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
              color: (theme) =>
                theme.palette.mode === 'dark' ? 'primary.contrastText' : 'primary.contrastText',
              border: 2,
              borderColor: 'primary.main',
              borderRadius: 2,
              zIndex: 10,
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              🎤 Ready to Start Your Interview Session!
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3, maxWidth: '80%' }}>
              To begin your mock interview session, click the <strong>"Start Session"</strong> button below.
            </Typography>

            <Box
              sx={{
                p: 3,
                mb: 3,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                maxWidth: '80%',
              }}
            >
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1 }}>
                Steps to start:
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                1. Click <strong>"Start Session"</strong> button<br />
                2. Wait for connection to establish<br />
                3. Look for <strong>"Listening..."</strong> status<br />
                4. Start speaking to begin the interview
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ maxWidth: '80%' }}>
              Once you start the session, this message will disappear and the audio visualization will appear.
              The AI interviewer will wait for you to speak first.
            </Typography>
          </Paper>
        )}

        {/* Canvas - Shows when session is active or connecting */}
        {!showWelcome && (
          <canvas 
            ref={canvasRef} 
            width="100%" 
            height="100%" 
            style={{
              opacity: connectStatus === "connected" ? 1 : 0.5
            }}
          />
        )}
        {connectStatus === "connected" && startTime && (
        <SessionTimer 
            startTime={startTime} 
            isActive={true}
            featureCode="INTERVIEW_PREP" // Match DB
            onLimitReached={handleLimitReached}
        />
      )}
      </Box>

      {connectStatus === "connected" ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Typography variant="caption" color="text.secondary" sx={{mt: 1}}>
            Listening...
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={disconnectWebSocket}
          >
            {refreshStatusButtonUI()}
          </Button>
        </Box>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={connectWebSocket}
          disabled={connectStatus === "connecting"}
          size="large"
          sx={{ minWidth: '140px' }}
        >
          {connectStatus === "connecting" ? (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} color="inherit" />
              Connecting...
            </Box>
          ) : (
            "Start Session"
          )}
        </Button>
      )}
    </Box>
  );
});

export default InterviewPrepOpenAI;