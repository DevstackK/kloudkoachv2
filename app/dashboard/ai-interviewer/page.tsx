"use client";

import * as React from "react";
import { Container, Paper, Typography, TextField, Button, Box, Chip, CircularProgress, Alert } from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import MicIcon from "@mui/icons-material/Mic";
import { useAiInterviewer } from "@/hooks/useAiInterviewer";

const statusLabel: Record<string, string> = {
  idle: "Not started",
  connecting: "Connecting…",
  asking: "Interviewer speaking…",
  listening: "Your turn — listening",
  thinking: "Thinking…",
  done: "Interview complete",
  error: "Error",
  stopped: "Session ended",
};

const statusColor: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  idle: "default",
  connecting: "info",
  asking: "info",
  listening: "success",
  thinking: "warning",
  done: "default",
  error: "error",
  stopped: "default",
};

export default function AiInterviewerPage() {
  const [jobRole, setJobRole] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const { status, interimTranscript, turns, error, questionNumber, start, stop } = useAiInterviewer();

  const isActive = status === "asking" || status === "listening" || status === "thinking" || status === "connecting";
  const hasEnded = status === "done" || status === "stopped";
  const currentTurn = turns[turns.length - 1];
  const earlierTurns = turns.slice(0, -1).reverse();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    await start({ jobRole, jobDescription });
  };

  if (!isActive && !hasEnded) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h5" fontWeight="bold" align="center" color="primary" gutterBottom>
            AI Interviewer
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            A simulated interviewer asks you real questions out loud, one at a time - you answer by speaking, just
            like a real interview. Uses your mic and speakers.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleStart} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Job Role" value={jobRole} onChange={(e) => setJobRole(e.target.value)} required fullWidth />
            <TextField
              label="Job Description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="Paste the job description for more tailored questions (optional)."
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<RecordVoiceOverIcon />}
              disabled={!jobRole}
              sx={{ mt: 1, py: 1.5, borderRadius: "12px" }}
            >
              Start Interview
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ flex: 1 }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            {jobRole || "AI Interview"} {questionNumber > 0 && !hasEnded ? `— Q${questionNumber}` : ""}
          </Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Chip label={statusLabel[status]} color={statusColor[status]} size="small" />
            {isActive && (
              <Button variant="outlined" color="error" size="small" onClick={stop}>
                End Interview
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {status === "done" && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Interview complete — {turns.length} questions answered. Nice work.
          </Alert>
        )}

        {status === "stopped" && turns.length === 0 && <Alert severity="info">Session ended with no recorded turns.</Alert>}

        {/* Current question: always shown prominently, spoken aloud too */}
        {currentTurn && (
          <Paper
            elevation={2}
            sx={{ p: 3, mb: 2, borderRadius: "18px", border: "1px solid", borderColor: "primary.main" }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <RecordVoiceOverIcon fontSize="small" color="primary" />
              <Typography variant="caption" color="text.secondary">
                Interviewer
              </Typography>
              {status === "asking" && <CircularProgress size={12} sx={{ ml: 0.5 }} />}
            </Box>
            <Typography variant="h6" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontWeight: 500, mb: currentTurn.answer ? 2 : 0 }}>
              {currentTurn.question}
            </Typography>

            {status === "listening" && interimTranscript && (
              <Box sx={{ mt: 2, p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <MicIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="text.secondary">
                    You — listening…
                  </Typography>
                </Box>
                <Typography variant="body2">{interimTranscript}</Typography>
              </Box>
            )}

            {currentTurn.answer && (
              <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Your answer
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {currentTurn.answer}
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {status === "listening" && !interimTranscript && (
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} color="text.secondary" py={2}>
            <MicIcon fontSize="small" />
            <Typography variant="body2">Your turn — speak your answer whenever you&apos;re ready.</Typography>
          </Box>
        )}

        {/* Earlier turns: compact history */}
        {earlierTurns.map((turn, i) => (
          <Paper key={i} elevation={0} sx={{ p: 2, mb: 1.5, borderRadius: "14px", border: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
              {turn.question}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              {turn.answer}
            </Typography>
          </Paper>
        ))}

        {!currentTurn && isActive && (
          <Box display="flex" flexDirection="column" alignItems="center" py={8} color="text.secondary">
            <RecordVoiceOverIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography>Getting your first question ready…</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
