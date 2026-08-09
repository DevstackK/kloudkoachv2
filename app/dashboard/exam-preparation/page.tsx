"use client";

import * as React from "react";
import { extractTextFromFile } from "@/lib/extractText";
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityIcon from "@mui/icons-material/Visibility";

type ExamQuestion = {
  question: string;
  type: "multiple_choice" | "open_ended";
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
};

type ExamResult = {
  sessionId: string;
  examTitle: string;
  questions: ExamQuestion[];
};

export default function ExamPreparationPage() {
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [courseMaterial, setCourseMaterial] = React.useState("");
  const [courseMaterialFileName, setCourseMaterialFileName] = React.useState("");

  const [isExtracting, setIsExtracting] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState("");
  const [exam, setExam] = React.useState<ExamResult | null>(null);
  const [revealed, setRevealed] = React.useState<Set<number>>(new Set());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsExtracting(true);
    setError("");
    try {
      const text = await extractTextFromFile(file);
      setCourseMaterial(text);
      setCourseMaterialFileName(file.name);

      fetch("/api/coursematerial", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      }).catch(() => {});
    } catch {
      setError("Could not read that file.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsGenerating(true);
    setExam(null);
    setRevealed(new Set());
    try {
      const res = await fetch("/api/exam-prep/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject, description, courseMaterial: courseMaterial || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to generate exam.");
      }
      setExam(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate exam.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (exam) {
    return (
      <Container maxWidth="md" sx={{ py: 6, flex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold">
            {exam.examTitle}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setExam(null);
              setRevealed(new Set());
            }}
          >
            New Exam
          </Button>
        </Box>

        {exam.questions.map((q, i) => (
          <Paper key={i} elevation={0} sx={{ p: 3, mb: 2, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Chip label={q.type === "multiple_choice" ? "Multiple choice" : "Open-ended"} size="small" color="primary" variant="outlined" />
            </Box>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              {i + 1}. {q.question}
            </Typography>
            {q.options && q.options.length > 0 && (
              <List dense>
                {q.options.map((opt, j) => (
                  <ListItem key={j} sx={{ py: 0 }}>
                    <ListItemText primary={opt} />
                  </ListItem>
                ))}
              </List>
            )}
            {(q.correctAnswer || q.explanation) &&
              (revealed.has(i) ? (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                  {q.correctAnswer && (
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      Answer: {q.correctAnswer}
                    </Typography>
                  )}
                  {q.explanation && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {q.explanation}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Button
                  size="small"
                  startIcon={<VisibilityIcon fontSize="small" />}
                  onClick={() => setRevealed((prev) => new Set(prev).add(i))}
                  sx={{ mt: 1.5, textTransform: "none" }}
                >
                  Reveal Answer
                </Button>
              ))}
          </Paper>
        ))}
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h5" fontWeight="bold" align="center" color="primary" gutterBottom>
          Exam Setup
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Kloud Koach AI generates a focused practice exam from your subject, description, and optional course material.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required fullWidth />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={4}
            required
            fullWidth
            placeholder="Describe what you want to focus on for this exam preparation..."
          />

          <Divider>
            <Chip label="Optional course material" size="small" />
          </Divider>

          <Button variant="outlined" component="label" startIcon={isExtracting ? <CircularProgress size={16} /> : <UploadFileIcon />} disabled={isExtracting}>
            {courseMaterialFileName || "Upload PDF or DOCX"}
            <input type="file" hidden accept=".pdf,.docx" onChange={handleFileChange} />
          </Button>

          <Button type="submit" variant="contained" size="large" disabled={isGenerating || !subject || !description} sx={{ mt: 1, py: 1.5, borderRadius: "12px" }}>
            {isGenerating ? <CircularProgress size={24} color="inherit" /> : "Generate Exam"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
