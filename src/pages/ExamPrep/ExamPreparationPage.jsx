import React, { useState, useRef } from "react";
import {
  Box,
  CircularProgress,
  Grid,
  Button,
  Typography,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExamPrepOpenAI from "../../components/ai/exam-prep/LLMIntegration/ExamPrepOpenAI";
import ExamSetupForm from "../../components/common/exam/ExamSetupForm";
import ExamPrepTranscription from "../../components/ai/exam-prep/Transcription/ExamPrepTranscription";
import { useExamSetup } from "../../context/ExamSetupContext";

const ExamPreparationPage = () => {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [examData, setExamData] = useState(null);

  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("notConnect");
  const { formData, clearForm } = useExamSetup();
  const appRef = useRef(null);

  const handleGoBack = () => {
    setIsConfirmed(false);
    if (appRef.current && appRef.current.stopSession) {
      appRef.current.stopSession();
    }
    clearForm(); // Clear the form when going back
  };

  const startSession = async (formData) => {
    setError(null);
    setLoading(true);
    
    try {
      // Call n8n webhook to generate exam questions
      const response = await fetch(
        "https://kloudstack.online/webhook/exam-prep",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Host": "n8n.local"
          },
          body: JSON.stringify({
            sessionId: sessionId,
            subject: formData.subject,
            description: formData.description,
            courseMaterial: formData.courseMaterial,
            examType: "exam-prep",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (data[0].output) {
        setExamData(data[0].output);
        setIsConfirmed(true);
        // Log the generated questions for debugging
        console.log("Generated exam questions:", data[0].output.questions);
      } else {
        throw new Error(data.error || "Failed to generate exam questions");
      }
    } catch (err) {
      console.error("Exam generation error:", err);
      setError(err.message || "Failed to generate exam questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setChatHistory([]);
  };

  const isGoBackDisabled = connectionStatus === "connecting" || connectionStatus === "connected";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "background.default",
        p: 2,
      }}
    >
      {/* CASE 1: Exam setup form */}
      { !loading && !isConfirmed && (
        <Box sx={{ width: "100%" }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
            AI Exam Preparation
          </Typography>
          <Typography fontWeight="bold" color="text.secondary" align="center" >
            Prepare for your exams with AI-powered practice. Our AI will generate questions based on your course material and subject.
          </Typography>
          <ExamSetupForm loading={loading} onSubmit={startSession} />
          {error && (
            <Typography color="error" sx={{ mt: 2, textAlign: "center" }}>
              ⚠️ {error}
            </Typography>
          )}
        </Box>
      )}

      {/* CASE 2: Loading */}
      {loading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(5px)",
            backgroundColor: "rgba(255,255,255,0.7)",
            zIndex: 9999,
          }}
        >
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Fetching exam data…</Typography>
        </Box>
      )}

      {/* CASE 3: After data is fetched */}
      {!loading && isConfirmed && (
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          <Grid container spacing={2} sx={{ flexGrow: 1 }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ height: "750px", display: "flex", flexDirection: "column" }}>
                <ExamPrepOpenAI
                  ref={appRef}
                  answers={answers}
                  setAnswers={setAnswers}
                  question={question}
                  setQuestion={setQuestion}
                  chatHistory={chatHistory}
                  setChatHistory={setChatHistory}
                  formData={formData}
                  examData={examData}
                  onConnectionStatusChange={setConnectionStatus}
                />
                <Button
                  startIcon={<ArrowBackIcon />}
                  color="primary"
                  onClick={handleGoBack}
                  sx={{ mt: "auto", alignSelf: "center" }}
                >
                  {isGoBackDisabled ? "Session Active..." : "Go Back"}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ height: "750px", p: 3 }}>
                  <ExamPrepTranscription
                    chatHistory={chatHistory}
                    question={question}
                    answers={answers}
                    handleClearHistory={handleClearHistory}
                  />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default ExamPreparationPage;