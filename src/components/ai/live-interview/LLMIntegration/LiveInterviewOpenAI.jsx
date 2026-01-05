import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import "./LiveInterviewOpenAI.css";
import { type } from "microsoft-cognitiveservices-speech-sdk/distrib/lib/src/common.speech/SpeechServiceConfig";
import { useSession } from "../../../../context/SessionContext";
import { useInterviewSetup } from '../../../../context/InterviewSetupContext'; // Import
import { useAuth } from "../../../../context/AuthContext";
import api, { subscriptionService } from "../../../../services/api"; // âś… Import subscriptionService
import SessionTimer from "../../../common/SessionTimer"; // âś… Import Timer

const OPENAI_KEY=process.env.REACT_APP_OPENAI_API_KEY;

const RTC_CONFIGURATION = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // Google STUN server
    ],
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
  isFullscreen
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

  const localStreamRef = useRef(null);
  const questionRef = useRef("");
  const answersRef = useRef("");

  const videoRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState(null);
  const { setActiveStopSession } = useSession();
  const { clearForm } = useInterviewSetup();


  // Update button UI
  const refreshStatusButtonUI = () => {
    if (connectStatus === "notConnect") return "Start Session";
    if (connectStatus === "connecting") return "Connecting...";
    if (connectStatus === "connected") return "Stop";
  };

  const refreshListeningStatus = () => {
    if (connectStatus === "connected")
        {
            return true;
        }
        else 
        {
            return false;
        }
  }

  const stopSharing = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);
  };

  // Get Secret Key from OpenAI API
  const getOpenAIWebSocketSecretKey = async () => {
    const response = await api.post('/Realtime/session', {
        jobDescription: formData.jobDescription,
        cvText: formData.cv,
        jobTitle: formData.jobRole,
        interviewRound: formData.interviewRound,
        interviewType: "live-interview"
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

  // Connect to WebRTC and OpenAI
  const connectWebSocket = async () => {
    if (connectStatus !== "notConnect") {
      return;
    }
    setConnectStatus("connecting");
    setListening(refreshListeningStatus());

    try {
      // 1. Get WebSocket key
      const secretDict = await getOpenAIWebSocketSecretKey();

      // 2. Init RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      console.log("1. Init RTCPeerConnection");

      // 3. Setup local audio
      console.log("2. Setup local audio");
      const localStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      setStream(localStream);
      setIsSharing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = localStream;
        videoRef.current.play();
      }

      if (!localStream || localStream.getTracks().length === 0) {
        console.error("No audio tracks found in the local stream");
        setConnectStatus("notConnect");
        setListening(refreshListeningStatus());
        return;
      }

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      localStreamRef.current = localStream;

      // pc.ontrack = (event) => {
      //   console.log("Remote audio track received:", event.streams[0]);
      //   if (event.streams[0]) {
      //     const audioElement = new Audio();
      //     audioElement.srcObject = event.streams[0];
      //     audioElement.play().catch((error) => console.error('Audio play error:', error));
      //   }
      // };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || 
            pc.iceConnectionState === 'disconnected' || 
            pc.iceConnectionState === 'closed') {

          console.warn("WebRTC connection failed or disconnected. Stopping session.");
          disconnectWebSocket();
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
            // Use functional update to get latest state
            setOutputText(prev => {
            const newText = prev + (message.delta || "");
            // Update parent component's state with latest value
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
            // Use functional update to get latest state
            setInputText(prev => {
            const newText = prev + (message.transcript || "");
            // Update parent component's state with latest value
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
    // 1. Clean up WebRTC
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // 2. Call Backend to Stop Session & Record Usage
    if (dbSessionId) {
        try {
            console.log(`Stopping session ${dbSessionId}...`);
            await subscriptionService.stopSession(dbSessionId, 0); // Pass 0 tokens for now, allow backend to calc time
            await refreshUsage(); // Update global usage bar
        } catch (error) {
            console.error("Failed to stop session on backend", error);
        }
        setDbSessionId(null);
    }

    // 3. Reset UI State
    setConnectStatus("notConnect");
    setOutputText("");
    setAnswers("");
    setQuestion("");
    setInputText("");
    setChatHistory([]);
    setActiveStopSession(null);
  };

  const handleLimitReached = () => {
    alert("You have reached your session time limit.");
    disconnectWebSocket();
  };

  useImperativeHandle(ref, () => ({
    stopSession: disconnectWebSocket,
  }));

  useEffect(() => {
      // Return a cleanup function
      return () => {
        // If the component unmounts, check if a connection is active
        if (peerConnection) { 
          console.log("Component unmounting, stopping session...");
          disconnectWebSocket();
        }
        if (onConnectionStatusChange) {
          onConnectionStatusChange(connectStatus);
        }
      };
      // peerConnection is a good dependency. When it's set or cleared,
      // this effect re-evaluates. The cleanup runs when it unmounts.
    }, [peerConnection, onConnectionStatusChange]); // Dependency on peerConnection

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={isFullscreen ? 0 : 2} height="100%">
      <Box
        className="video-container"
        sx={{
          width: "100%",
          height: "100%",             // take full height of parent Box
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: isFullscreen ? 0 : 2, // No radius in fullscreen
          backgroundColor: "#000", // optional, adds black bars if needed
        }}
      >
        <video
        muted
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
        style={{
            // 4. Conditional styling for fullscreen video
            objectFit: isFullscreen ? "cover" : "contain", // Cover fills the screen
            borderRadius: isFullscreen ? 0 : "12px",
            
            // --- Fullscreen Video Styles ---
            position: isFullscreen ? 'fixed' : 'relative',
            top: isFullscreen ? 0 : 'auto',
            left: isFullscreen ? 0 : 'auto',
            width: isFullscreen ? '100vw' : '100%',
            height: isFullscreen ? '100vh' : '100%',
            zIndex: isFullscreen ? 1900 : 'auto', // Behind controls and transcript
            pointerEvents: isFullscreen ? 'none' : 'auto', // Click-through
          }}
      />
      </Box>

      {connectStatus === "connected" ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          {connectStatus === 'connected' && <Typography variant="caption" color="text.secondary" sx={{mt: 1}}>Listening...</Typography>}
          {connectStatus === "connected" && startTime && (
          <SessionTimer 
                startTime={startTime} 
                isActive={true}
                featureCode="LIVE_INTERVIEW" // Must match DB
                onLimitReached={handleLimitReached}
            />
          )}
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
        >
          {refreshStatusButtonUI()}
        </Button>
      )}
    </Box>
  );
});

export default LiveInterviewOpenAI;
