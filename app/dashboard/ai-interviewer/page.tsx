"use client";

import * as React from "react";
import Link from "next/link";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import MicIcon from "@mui/icons-material/Mic";
import AssessmentIcon from "@mui/icons-material/Assessment";
import NotesIcon from "@mui/icons-material/Notes";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAiInterviewer } from "@/hooks/useAiInterviewer";
import { extractTextFromFile } from "@/lib/extractText";

const statusLabel: Record<string, string> = {
  idle: "Not started",
  connecting: "Connecting…",
  asking: "Interviewer speaking…",
  listening: "Your turn — listening",
  thinking: "Thinking…",
  scoring: "Scoring your answers…",
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
  scoring: "warning",
  done: "default",
  error: "error",
  stopped: "default",
};

export default function AiInterviewerPage() {
  const [jobRole, setJobRole] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const [answerStyle, setAnswerStyle] = React.useState<"prose" | "bullets">("prose");
  const [activeResumeName, setActiveResumeName] = React.useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = React.useState(true);
  const [isUploadingResume, setIsUploadingResume] = React.useState(false);
  const [resumeError, setResumeError] = React.useState("");
  const [acceptedDisclaimer, setAcceptedDisclaimer] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { status, interimTranscript, turns, error, questionNumber, sessionId, start, stop, retry } = useAiInterviewer();

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/resume", { credentials: "include" });
        const json = await res.json();
        if (json.success) {
          const active = json.data.find((r: { isActive: boolean }) => r.isActive);
          setActiveResumeName(active?.fileName ?? null);
        }
      } finally {
        setResumeLoading(false);
      }
    })();
  }, []);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      setResumeError("Only PDF and DOCX files are allowed.");
      return;
    }

    setIsUploadingResume(true);
    setResumeError("");
    try {
      const fileText = await extractTextFromFile(file);
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rawText: fileText, fileName: file.name, fileType: file.type }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Upload failed");
      setActiveResumeName(file.name);
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Failed to upload resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const isActive =
    status === "asking" || status === "listening" || status === "thinking" || status === "connecting" || status === "scoring";
  const hasEnded = status === "done" || status === "stopped";
  // A failure mid-interview (most commonly the access-token cookie
  // expiring - interviews can run past its ~15min lifetime) shouldn't
  // force starting over from question 1. If there's an existing session,
  // stay on this view and offer to resume rather than falling back to the
  // setup form and losing all progress.
  const isRecoverableError = status === "error" && !!sessionId;
  const currentTurn = turns[turns.length - 1];
  const earlierTurns = turns.slice(0, -1).reverse();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    await start({ jobRole, jobDescription, answerStyle });
  };

  if (!isActive && !hasEnded && !isRecoverableError) {
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

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              This is practice, not a real interview.
            </Typography>
            <Typography variant="body2">
              It&apos;s meant to help you rehearse and get comfortable answering out loud - not to guarantee you&apos;ll
              pass a real interview, and not a substitute for genuine preparation. See our{" "}
              <Link href="/terms" style={{ color: "inherit", fontWeight: 600 }} target="_blank">
                Terms of Service
              </Link>{" "}
              for full detail.
            </Typography>
          </Alert>

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

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Resume (used to tailor questions to your actual experience)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf,.docx"
                onChange={handleResumeUpload}
              />
              <Button
                variant="outlined"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingResume}
                startIcon={
                  isUploadingResume ? (
                    <CircularProgress size={16} />
                  ) : activeResumeName ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : (
                    <UploadFileIcon fontSize="small" />
                  )
                }
                sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
              >
                {isUploadingResume
                  ? "Uploading…"
                  : !resumeLoading && activeResumeName
                    ? `Using: ${activeResumeName} (tap to replace)`
                    : "Upload your CV/resume (PDF or DOCX)"}
              </Button>
              {resumeError && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                  {resumeError}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Feedback style (questions are always spoken naturally)
              </Typography>
              <ToggleButtonGroup
                value={answerStyle}
                exclusive
                fullWidth
                onChange={(_, value) => value && setAnswerStyle(value)}
                size="small"
              >
                <ToggleButton value="prose" sx={{ textTransform: "none", gap: 1 }}>
                  <NotesIcon fontSize="small" /> Normal text
                </ToggleButton>
                <ToggleButton value="bullets" sx={{ textTransform: "none", gap: 1 }}>
                  <FormatListBulletedIcon fontSize="small" /> Bullet points
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptedDisclaimer}
                  onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  I understand this is practice, not a guarantee of interview success.
                </Typography>
              }
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<RecordVoiceOverIcon />}
              disabled={!jobRole || !acceptedDisclaimer}
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
            {isActive && status !== "scoring" && (
              <Button variant="outlined" color="error" size="small" onClick={stop}>
                End Interview
              </Button>
            )}
          </Box>
        </Box>

        {error && !isRecoverableError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {status === "done" && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            action={
              sessionId && (
                <Button
                  component={Link}
                  href={`/dashboard/analytics/${sessionId}`}
                  color="inherit"
                  size="small"
                  startIcon={<AssessmentIcon />}
                >
                  View Results
                </Button>
              )
            }
          >
            Interview complete — {turns.length} questions answered. Your ratings and feedback are ready.
          </Alert>
        )}

        {status === "stopped" && turns.length === 0 && <Alert severity="info">Session ended with no recorded turns.</Alert>}

        {status === "stopped" && turns.length > 0 && sessionId && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button component={Link} href={`/dashboard/analytics/${sessionId}`} color="inherit" size="small" startIcon={<AssessmentIcon />}>
                View Transcript
              </Button>
            }
          >
            Interview ended early — {turns.length} question{turns.length === 1 ? "" : "s"} recorded. The full transcript is
            saved.
          </Alert>
        )}

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

        {/* Connection lost mid-interview (commonly the login session
            timing out) - reconnect and pick up right where it stopped
            instead of losing everything already answered. */}
        {isRecoverableError && (
          <Paper
            elevation={0}
            sx={{ p: 2.5, mb: 2, borderRadius: "14px", border: "1px solid", borderColor: "error.main", textAlign: "center" }}
          >
            <Typography variant="body2" color="error" sx={{ mb: 1.5 }}>
              {error || "Connection lost."} Your progress so far ({turns.length} question{turns.length === 1 ? "" : "s"}) is
              still saved.
            </Typography>
            <Box display="flex" gap={1.5} justifyContent="center">
              <Button variant="contained" color="error" startIcon={<RefreshIcon />} onClick={retry}>
                Refresh Connection &amp; Continue
              </Button>
              <Button variant="text" color="inherit" onClick={stop}>
                End Interview Instead
              </Button>
            </Box>
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
