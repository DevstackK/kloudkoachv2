import { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Paper,
  useTheme,
} from "@mui/material";
import CourseMaterialManager from "../CourseMaterialManager";
import { useAuth } from "../../../context/AuthContext";
import { useExamSetup } from "../../../context/ExamSetupContext";

const ExamSetupForm = ({ onSubmit, loading }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { formData, setFormData } = useExamSetup();

  const handleCourseMaterialChange = (materialText) => {
    setFormData(prev => ({
      ...prev,
      courseMaterial: materialText
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "stretch",
        gap: "1.5rem",
        padding: "2rem 4rem",
        width: "100vw",
        height: "100vh",
        background: theme.palette.background.default,
      }}
    >
      {/* LEFT HALF â€” Exam Setup Form */}
      <Paper
        elevation={6}
        sx={{
          flex: 1,
          minWidth: "45%",
          borderRadius: "1rem",
          p: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <Typography
            variant="h5"
            align="center"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 600,
              mb: 1,
            }}
          >
            Exam Setup
          </Typography>

          <TextField
            label="Subject"
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            required
            fullWidth
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            multiline
            rows={4}
            required
            fullWidth
            placeholder="Describe what you want to focus on for this exam preparation..."
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mt: 2, py: 1.2, fontSize: "1rem" }}
          >
            {loading ? "Starting..." : "Confirm & Start"}
          </Button>
        </form>
      </Paper>

      {/* RIGHT HALF â€” Course Material Manager */}
      <Paper
        elevation={6}
        sx={{
          flex: 1,
          minWidth: "45%",
          borderRadius: "1rem",
          p: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <CourseMaterialManager onCourseMaterialChange={handleCourseMaterialChange} />
      </Paper>
    </div>
  );
};

export default ExamSetupForm;