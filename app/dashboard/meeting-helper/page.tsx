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
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import NotesIcon from "@mui/icons-material/Notes";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { useCoachSession } from "@/hooks/useCoachSession";
import { useBeforeUnloadWarning } from "@/hooks/useBeforeUnloadWarning";

const statusLabel: Record<string, string> = {
  idle: "Not started",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Thinking…",
  error: "Error",
  stopped: "Session ended",
};

const statusColor: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  idle: "default",
  connecting: "info",
  listening: "success",
  thinking: "warning",
  error: "error",
  stopped: "default",
};

export default function MeetingHelperPage() {
  const [meetingTopic, setMeetingTopic] = React.useState("");
  const [agendaNotes, setAgendaNotes] = React.useState("");
  const [answerStyle, setAnswerStyle] = React.useState<"prose" | "bullets">("bullets");
  const [transparentMode, setTransparentMode] = React.useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = React.useState(false);
  const { status, interimTranscript, turns, error, sessionId, start, stop, retryLastResponse } = useCoachSession();

  const isActive = status === "listening" || status === "thinking" || status === "connecting";
  useBeforeUnloadWarning(isActive);
  const latestTurn = turns[turns.length - 1];
  const earlierTurns = turns.slice(0, -1).reverse();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    await start({ type: "meeting_helper", jobRole: meetingTopic, jobDescription: agendaNotes, audioSource: "tab", answerStyle });
  };

  if (!isActive && status !== "stopped") {
    return (
      <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h5" fontWeight="bold" align="center" color="primary" gutterBottom>
            Meeting Helper
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Share the tab your work meeting is running in (Meet, Zoom web, Teams web) and Kloud Koach quietly listens
            in, suggesting quick text notes on what you could say next - no voice, just text on your screen.
          </Typography>

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Use responsibly - respect your meeting and organization&apos;s policies.
            </Typography>
            <Typography variant="body2">
              This is meant to help you organize your own thinking during a meeting, not to put words in your mouth
              or to record/transcribe colleagues without appropriate consent. Check your organization&apos;s
              recording and AI-use policies before sharing a meeting tab. See our{" "}
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
            <TextField
              label="Meeting topic"
              value={meetingTopic}
              onChange={(e) => setMeetingTopic(e.target.value)}
              required
              fullWidth
              placeholder="e.g. Weekly product sync"
            />
            <TextField
              label="Agenda or context notes (optional)"
              value={agendaNotes}
              onChange={(e) => setAgendaNotes(e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="Paste the agenda, or any background that would help Kloud Koach give better suggestions."
            />

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Suggestion style
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
                <Checkbox checked={acceptedDisclaimer} onChange={(e) => setAcceptedDisclaimer(e.target.checked)} size="small" />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  I understand this is meant to help me think, and that respecting my meeting&apos;s policies is my
                  responsibility.
                </Typography>
              }
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<ScreenShareIcon />}
              disabled={!meetingTopic || !acceptedDisclaimer}
              sx={{ mt: 1, py: 1.5, borderRadius: "12px" }}
            >
              Share a Tab &amp; Start
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: transparentMode ? "transparent" : "background.default",
        transition: "background-color 0.2s ease",
      }}
    >
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            {meetingTopic || "Meeting Helper"}
          </Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Chip label={statusLabel[status]} color={statusColor[status]} size="small" />
            <Tooltip title={transparentMode ? "Switch to solid background" : "Switch to transparent overlay mode"}>
              <IconButton size="small" onClick={() => setTransparentMode((v) => !v)}>
                {transparentMode ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {isActive && (
              <Button variant="outlined" color="error" size="small" onClick={stop}>
                End Session
              </Button>
            )}
          </Box>
        </Box>

        {error && !latestTurn?.failed && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {status === "stopped" && turns.length === 0 && (
          <Alert severity="info">Session ended with no recorded turns.</Alert>
        )}

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
            Session ended — {turns.length} moment{turns.length === 1 ? "" : "s"} recorded. The full transcript is saved.
          </Alert>
        )}

        {interimTranscript && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: "12px",
              bgcolor: transparentMode ? "rgba(123, 31, 162, 0.08)" : "action.hover",
              backdropFilter: transparentMode ? "blur(6px)" : "none",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Listening…
            </Typography>
            <Typography variant="body2">{interimTranscript}</Typography>
          </Paper>
        )}

        {/* Most recent suggestion: large and prominent - this is the one thing that matters mid-meeting */}
        {latestTurn && (
          <Paper
            elevation={transparentMode ? 0 : 2}
            sx={{
              p: 3,
              mb: 2,
              borderRadius: "18px",
              border: "1px solid",
              borderColor: "primary.main",
              bgcolor: transparentMode ? "rgba(255,255,255,0.85)" : "background.paper",
              backdropFilter: transparentMode ? "blur(10px)" : "none",
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Heard: &quot;{latestTurn.question}&quot;
            </Typography>
            <Typography variant="h6" color="primary.main" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontWeight: 500 }}>
              {latestTurn.answer}
              {latestTurn.isStreaming && <CircularProgress size={14} sx={{ ml: 1 }} />}
            </Typography>
            {latestTurn.failed && (
              <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                  {error || "Failed to get a response."} The session is still connected — you can retry without
                  restarting.
                </Typography>
                <Button variant="outlined" color="error" size="small" startIcon={<RefreshIcon />} onClick={retryLastResponse}>
                  Retry This Suggestion
                </Button>
              </Box>
            )}
          </Paper>
        )}

        {/* Earlier turns: compact, muted history below the current suggestion */}
        {earlierTurns.map((turn, i) => (
          <Paper
            key={i}
            elevation={0}
            sx={{
              p: 2,
              mb: 1.5,
              borderRadius: "14px",
              border: "1px solid",
              borderColor: "divider",
              opacity: transparentMode ? 0.7 : 1,
              bgcolor: transparentMode ? "rgba(255,255,255,0.6)" : "background.paper",
              backdropFilter: transparentMode ? "blur(6px)" : "none",
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Heard: &quot;{turn.question}&quot;
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              {turn.answer}
            </Typography>
          </Paper>
        ))}

        {turns.length === 0 && isActive && (
          <Box display="flex" flexDirection="column" alignItems="center" py={8} color="text.secondary">
            <ScreenShareIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography>Listening to the shared tab — suggestions will appear here as the meeting goes.</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
