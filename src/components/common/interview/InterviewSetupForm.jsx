import { useState } from "react";
import {
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  useTheme,
  Alert,
  Box, // Import Box for better layout handling
} from "@mui/material";
import CVManager from "../CVManager";
import { useAuth } from "../../../context/AuthContext";
import { useInterviewSetup } from "../../../context/InterviewSetupContext";

const InterviewSetupForm = ({ onSubmit, loading }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { formData, setFormData } = useInterviewSetup();
  const [error, setError] = useState("");

  // ✅ When CVManager changes CV text
  const handleCVChange = (cvText) => {
    setFormData((prev) => ({
      ...prev,
      cv: cvText,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!user?.resumeRawText && !formData.cv) {
      setError("Please upload or select a resume to proceed.");
      return;
    }
    const submitData = {
      ...formData,
      cv: formData.cv || user?.resumeRawText || "", // Use uploaded CV first, fall back to saved CV
    };
    onSubmit(submitData);
  };

  // Reusable Glassmorphism Style
  const glassStyle = {
    flex: 1,
    minWidth: "45%",
    borderRadius: "24px",
    p: 5,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    // Dynamic background based on Theme Mode
    background:
      theme.palette.mode === "dark"
        ? "rgba(30, 30, 30, 0.8)" // Dark glass
        : "rgba(255, 255, 255, 0.9)", // Light glass
    backdropFilter: "blur(10px)",
    border: "1px solid",
    borderColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.05)",
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "stretch",
        gap: "1.5rem",
        padding: "2rem 4rem",
        width: "100vw",
        height: "100vh", // Use minHeight to prevent cutoff on small screens
        bgcolor: "background.default", // ✅ Uses theme background color
        transition: "background-color 0.3s ease",
      }}
    >
      {/* LEFT HALF — Interview Setup Form */}
      <Paper elevation={3} sx={glassStyle}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography
            variant="h5"
            align="center"
            sx={{
              color: "primary.main",
              fontWeight: 600,
              mb: 1,
            }}
          >
            Interview Setup
          </Typography>

          <TextField
            label="Job Role"
            value={formData.jobRole}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, jobRole: e.target.value }))
            }
            required
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                // Remove hardcoded 'white', let theme handle it
                bgcolor: "background.paper",
              },
              mb: 2,
            }}
          />

          <TextField
            select
            label="Interview Round"
            value={formData.interviewRound}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, interviewRound: e.target.value }))
            }
            required
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                bgcolor: "background.paper",
              },
              mb: 2,
            }}
          >
            <MenuItem value="Initial Screening">Initial Screening</MenuItem>
            <MenuItem value="Technical/Functional Interview">
              Technical/Functional Interview
            </MenuItem>
            <MenuItem value="Managerial/Team Fit Interview">
              Managerial/Team Fit Interview
            </MenuItem>
            <MenuItem value="Final Interview (Executive/Leadership Round)">
              Final Interview (Executive/Leadership Round)
            </MenuItem>
          </TextField>

          <TextField
            label="Job Description"
            value={formData.jobDescription}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, jobDescription: e.target.value }))
            }
            multiline
            rows={4}
            required
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                bgcolor: "background.dark",
              },
              mb: 2,
            }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={!user?.resumeRawText && !formData.cv}
            sx={{
              mt: 2,
              py: 1.5,
              borderRadius: "30px",
              fontWeight: "bold",
              boxShadow: "0 4px 14px 0 rgba(123, 31, 162, 0.39)",
            }}
          >
            Confirm & Start Session
          </Button>
        </form>
      </Paper>

      {/* RIGHT HALF — CV Manager */}
      <Paper elevation={6} sx={glassStyle}>
        {/* ✅ Pass callback to CVManager */}
        <CVManager onCVChange={handleCVChange} />
      </Paper>
    </Box>
  );
};

export default InterviewSetupForm;