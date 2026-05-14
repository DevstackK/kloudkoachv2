import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/common/Header";
import LiveInterviewOpenAI from "../../components/ai/live-interview/LLMIntegration/LiveInterviewOpenAI";
import LiveInterviewTranscription from "../../components/ai/live-interview/Transcription/LiveInterviewTranscription";
import Footer from "../../components/common/Footer";
import * as mammoth from "mammoth";
import pdfToText from 'react-pdftotext';
import LZString from "lz-string";
import { useAuth } from "../../context/AuthContext";
import { useOutletContext } from 'react-router-dom';
import InterviewSetupForm from '../../components/common/interview/InterviewSetupForm';
import {
  Container,
  Grid,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  useTheme,
} from "@mui/material";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import "./LiveInterviewPage.css";

const LiveInterviewPage = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [answers, setAnswers] = useState("");
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("notConnect");
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { isFullscreenMode, setIsFullscreenMode } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const appRef = useRef(null);
  const [formData, setFormData] = useState(null); // ✅ new state
  const [turnStatus, setTurnStatus] = useState(""); // "speaking", "thinking", "responding", ""

  const [errors, setErrors] = useState({
    jobDescription: '',
    meetingTitle: '',
    cvFile: ''
  });

  // Animation effect (keep your existing useEffect)
  useEffect(() => {
    const elementsToAnimate = document.querySelectorAll(".fade-in-up-once");
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-up");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    elementsToAnimate.forEach((el) => observer.observe(el));

    if (user?.resumeRawText) {
      try {
        // const decompressedText = LZString.decompressFromUTF16(user.resumeRawText);
        setFormData(prev => ({
          ...prev,
          cvText: user.resumeRawText,
          cvFile: { name: "Existing CV" }
        }));
      } catch (error) {
        console.error("Error decompressing CV:", error);
        setErrors(prev => ({ ...prev, cvFile: 'Error loading existing CV' }));
      }
    }

    return () => observer.disconnect();
  }, [user]);

  const handleGoBack = () => {
    setIsConfirmed(false);
    setIsFullscreenMode(false);
    if (appRef.current && appRef.current.stopSession) {
      appRef.current.stopSession();
    }
  };

  const handleClearHistory = () => {
    setChatHistory([]);
  };

  const startSession = async ({ cv, jobRole, interviewRound, jobDescription }) => {
    setError(null);
    setLoading(true);
    setFormData({ cv, jobRole, interviewRound, jobDescription }); // ✅ store form data for later use
    setIsConfirmed(true);
  };

  const isGoBackDisabled = connectionStatus === "connecting" || connectionStatus === "connected";
  const isSessionActive = connectionStatus === "connecting" || connectionStatus === "connected";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row", // Changed to column for centering
        alignItems: "center",
        justifyContent: "center", // Added for vertical centering
        flexGrow: 1, // Allow this box to fill the space from MainLayout
        backgroundColor: "background.default",
        // --- Fullscreen Wrapper Styles ---
        p: isFullscreenMode ? 0 : 2, // No padding in fullscreen
        position: isFullscreenMode ? 'fixed' : 'relative',
        inset: isFullscreenMode ? 0 : 'auto',
        zIndex: isFullscreenMode ? 2000 : 'auto', // High z-index in fullscreen
        overflow: isFullscreenMode ? 'hidden' : 'auto',
      }}
    >
      {!isConfirmed ? (
        <Box sx={{ width: "100%" }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
            Live Interview Co-Pilot
          </Typography>
          <Typography fontWeight="bold" color="text.secondary" align="center">
            Share your screen from a live interview (Meet, Zoom, Teams). Our AI will detect questions in real-time and provide you with suggested answers instantly.
          </Typography>
          <InterviewSetupForm loading={loading} onSubmit={startSession} />
          {error && (
            <Typography color="error" sx={{ mt: 2, textAlign: "center" }}>
              ❌ {error}
            </Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={isFullscreenMode ? 0 : 2} sx={{ flexGrow: 1, height: '100%' }}>
            <Grid
              item
              xs={12}
              md={isFullscreenMode ? 12 : 6}
              sx={{
                height: isFullscreenMode ? '100vh' : '750px',
                position: isFullscreenMode ? 'fixed' : 'relative',
                inset: isFullscreenMode ? 0 : 'auto',
              }}
            >
              <Paper
                elevation={isFullscreenMode ? 0 : 3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: isFullscreenMode ? 0 : 'inherit'
                }}
              >
                <LiveInterviewOpenAI
                  ref={appRef}
                  answers={answers}
                  setAnswers={setAnswers}
                  question={question}
                  setQuestion={setQuestion}
                  chatHistory={chatHistory}
                  setChatHistory={setChatHistory}
                  formData={formData}
                  onConnectionStatusChange={setConnectionStatus}
                  isFullscreen={isFullscreenMode}
                  setTurnStatus={setTurnStatus}
                />
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  // Position controls over the video in fullscreen
                  position: isFullscreenMode ? 'fixed' : 'relative',
                  bottom: isFullscreenMode ? 20 : 'auto',
                  left: isFullscreenMode ? '50%' : 'auto',
                  transform: isFullscreenMode ? 'translateX(-50%)' : 'none',
                  zIndex: isFullscreenMode ? 2100 : 'auto',
                  background: isFullscreenMode ? 'rgba(0,0,0,0.5)' : 'transparent',
                  borderRadius: isFullscreenMode ? '8px' : 0,
                }}>
                  <Button
                    startIcon={<ArrowBackIcon />}
                    color={isFullscreenMode ? "secondary" : "primary"}
                    variant={isFullscreenMode ? "contained" : "text"}
                    onClick={handleGoBack}
                    // Disable if connecting, but allow "Stop Session" if connected
                    disabled={connectionStatus === 'connecting'}
                  >
                    {isSessionActive ? "Stop Session" : "Go Back"}
                  </Button>
                  <IconButton
                    onClick={() => setIsFullscreenMode(!isFullscreenMode)}
                    color={isFullscreenMode ? "secondary" : "default"}
                    sx={{ ml: 2 }}
                  >
                    {isFullscreenMode ? <FullscreenExitIcon /> : <FullscreenIcon />}
                  </IconButton>
                </Box>
              </Paper>
            </Grid>
            {/* --- TRANSCRIPTION PANEL --- */}
            <Grid
              item
              xs={12}
              md={isFullscreenMode ? 12 : 6}
              sx={{
                // Hide panel in fullscreen if there is no text
                display: isFullscreenMode && !answers && !question && chatHistory.length === 0 ? 'none' : 'block',
                height: isFullscreenMode ? 'auto' : '750px',

                // --- Fullscreen Overlay Panel Styles ---
                position: isFullscreenMode ? 'fixed' : 'relative',
                top: isFullscreenMode ? '50%' : 'auto',
                left: isFullscreenMode ? '50%' : 'auto',
                transform: isFullscreenMode ? 'translate(-50%, -50%)' : 'none',
                width: isFullscreenMode ? 'min(60%, 720px)' : 'auto',
                maxHeight: isFullscreenMode ? '80vh' : 'auto',
                zIndex: isFullscreenMode ? 2050 : 'auto',
              }}
            >
              <Paper
                elevation={isFullscreenMode ? 12 : 3} // More shadow in fullscreen
                sx={{
                  height: isFullscreenMode ? 'auto' : '100%',
                  maxHeight: isFullscreenMode ? '80vh' : '100%',
                  display: 'flex',
                  flexDirection: 'column',

                  // --- Glass effect for fullscreen ---
                  background: isFullscreenMode ? 'rgba(0, 0, 0, 0.45)' : 'background.paper',
                  borderRadius: isFullscreenMode ? '16px' : 'inherit',
                  backdropFilter: isFullscreenMode ? 'blur(12px)' : 'none',
                  boxShadow: isFullscreenMode ? '0 12px 40px rgba(0, 0, 0, 0.65)' : 'inherit',
                  overflow: 'hidden', // Let transcription list scroll
                }}
              >
                <LiveInterviewTranscription
                  answers={answers}
                  question={question}
                  chatHistory={chatHistory}
                  handleClearHistory={handleClearHistory}
                  isFullscreen={isFullscreenMode} // <-- Pass state
                  turnStatus={turnStatus}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default LiveInterviewPage;