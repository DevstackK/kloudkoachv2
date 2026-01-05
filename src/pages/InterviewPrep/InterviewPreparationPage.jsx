import React, { useState, useRef } from "react";
import {
  Box,
  Grid,
  Button,
  Typography,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InterviewPrepOpenAI from "../../components/ai/interview-prep/LLMIntegration/InterviewPrepOpenAI";
import InterviewSetupForm from "../../components/common/interview/InterviewSetupForm";
import InterviewPrepTranscription from "../../components/ai/interview-prep/Transcription/InterviewPrepTranscription";

const InterviewPreparationPage = () => {
  const [formData, setFormData] = useState(null);

  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("notConnect");
  const appRef = useRef(null);

  const handleGoBack = () => {
    setIsConfirmed(false);
    if (appRef.current && appRef.current.stopSession) {
      appRef.current.stopSession();
    }
  };

  const startSession = async (formData) => {
    setFormData(formData); // Store form data for InterviewPrepOpenAI to use
    setIsConfirmed(true);
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
      {/* CASE 1: Interview setup form */}
      {!isConfirmed && (
        <Box sx={{ width: "100%" }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
            AI Mock Interview
          </Typography>
          <Typography fontWeight="bold" color="text.secondary" align="center" >
            Practice for your upcoming interview. Our AI will act as your interviewer, asking you tailored questions based on the job description and your resume.
          </Typography>
          <InterviewSetupForm onSubmit={startSession} />
        </Box>
      )}

      {/* CASE 2: After session is confirmed */}
      {isConfirmed && (
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          <Grid container spacing={2} sx={{ flexGrow: 1 }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ height: "750px", display: "flex", flexDirection: "column" }}>
                <InterviewPrepOpenAI
                  ref={appRef}
                  answers={answers}
                  setAnswers={setAnswers}
                  question={question}
                  setQuestion={setQuestion}
                  chatHistory={chatHistory}
                  setChatHistory={setChatHistory}
                  formData={formData} // Pass form data here
                  onConnectionStatusChange={setConnectionStatus}
                />
                <Button
                  startIcon={<ArrowBackIcon />}
                  color="primary"
                  onClick={handleGoBack}
                  sx={{ mt: "auto", alignSelf: "center" }}
                  disabled={isGoBackDisabled}
                >
                  {isGoBackDisabled ? "Session Active..." : "Go Back"}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ height: "750px", p: 3 }}>
                  <InterviewPrepTranscription
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

export default InterviewPreparationPage;