import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Box, Button, CircularProgress, useTheme, Typography } from "@mui/material";
import "./ExamPrepOpenAI.css";
import { useSession } from '../../../../context/SessionContext';

const OPENAI_KEY=process.env.REACT_APP_OPENAI_API_KEY;

const RTC_CONFIGURATION = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };

const ExamPrepOpenAI = forwardRef(({
  answers,
  question,
  setQuestion,
  setAnswers,
  chatHistory,
  setChatHistory,
  formData,
  examData,
  onConnectionStatusChange
}, ref) => {

  const [listeningOnMic, setListening] = useState(false);
  const [connectStatus, setConnectStatus] = useState("notConnect");
  const [peerConnection, setPeerConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [outputText, setOutputText] = useState("");
  const [inputText, setInputText] = useState("");
  const theme = useTheme();
  const localStreamRef = useRef(null);
  const questionRef = useRef("");
  const answersRef = useRef("");

  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState(null);

  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const { setActiveStopSession } = useSession();

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

  const getOpenAIWebSocketSecretKey = async () => {
    const url = "https://ksatif-001-site8.atempurl.com/api/Realtime/exam-session";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: formData.subject,
        description: formData.description,
        courseMaterial: formData.courseMaterial,
        examType: "exam-prep",
        metaData: examData
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch secret key: ${response.statusText}`);
    }
    return await response.json();
  };

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

  const connectWebSocket = async () => {
    if (connectStatus !== "notConnect") {
      return;
    }
    setConnectStatus("connecting");
    setListening(refreshListeningStatus());

    try {
      const secretDict = await getOpenAIWebSocketSecretKey();

      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      console.log("1. Init RTCPeerConnection");

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

      visualize(localStream);

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          const audioElement = new Audio();
          audioElement.srcObject = event.streams[0];
          audioElement.play().catch((error) => console.error('Audio play error:', error));
        }
      };

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

      console.log("5. Set Local Description");
      await pc.setLocalDescription(new RTCSessionDescription(offer));

      console.log("6. Send SDP to OpenAI");
      const clientSecret = secretDict?.data?.clientSecret;
      if (clientSecret) {
        await sendSDPToServer(pc, offer, clientSecret);
        setConnectStatus("connected");
        setListening(refreshListeningStatus());
        setActiveStopSession(() => disconnectWebSocket);
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

  const disconnectWebSocket = () => {
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
        }}
      >
        <canvas ref={canvasRef} width="100%" height="100%" />
      </Box>

      {connectStatus === "connected" ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          {connectStatus === 'connected' && <Typography variant="caption" color="text.secondary" sx={{mt: 1}}>Listening...</Typography>}
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

export default ExamPrepOpenAI;