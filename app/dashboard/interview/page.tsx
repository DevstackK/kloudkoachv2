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
import { useCoachSession } from "@/hooks/useCoachSession";
import CompanionQrButton from "@/components/CompanionQrButton";

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

export default function LiveInterviewPage() {
  const [jobRole, setJobRole] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const [answerStyle, setAnswerStyle] = React.useState<"prose" | "bullets">("prose");
  const [transparentMode, setTransparentMode] = React.useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = React.useState(false);
  const { status, interimTranscript, turns, error, sessionId, start, stop, retryLastResponse } = useCoachSession();

  const isActive = status === "listening" || status === "thinking" || status === "connecting";
  const latestTurn = turns[turns.length - 1];
  const earlierTurns = turns.slice(0, -1).reverse();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    await start({ type: "live_interview", jobRole, jobDescription, audioSource: "tab", answerStyle });
  };

  if (!isActive && status !== "stopped") {
    return (
      <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h5" fontWeight="bold" align="center" color="primary" gutterBottom>
            Live Interview Co-Pilot
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Start your real interview call in another browser tab (Meet, Zoom web, Teams web), then click below and
            choose that tab, checking &quot;Share tab audio&quot;. Kloud Koach listens in and suggests spoken answers
            in real time.
          </Typography>

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Use responsibly - you&apos;re responsible for how this is used.
            </Typography>
            <Typography variant="body2">
              This is meant to help you think clearly and stay composed in a live interview - not to let someone
              else answer for you or to misrepresent your own skills. Using it to deceive an interviewer, in breach
              of an employer&apos;s or platform&apos;s rules, or anywhere it isn&apos;t permitted is solely your
              responsibility, not Kloud Koach&apos;s. See our{" "}
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
              placeholder="Paste the job description for more tailored answers (optional)."
            />

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Answer style
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
                  I understand this is meant to help me, not to deceive an interviewer, and that how I use it is my
                  responsibility.
                </Typography>
              }
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<ScreenShareIcon />}
              disabled={!jobRole || !acceptedDisclaimer}
              sx={{ mt: 1, py: 1.5, borderRadius: "12px" }}
            >
              Share a Tab &amp; Start
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 3 }}>
            Interviewing over a native desktop app (Zoom/Teams desktop) instead of a browser tab? Tab sharing can&apos;t
            reach that audio — use the{" "}
            <Link href="/dashboard/extension" style={{ color: "inherit", fontWeight: 600 }}>
              Chrome extension
            </Link>{" "}
            instead.
          </Typography>
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
            {jobRole || "Live Interview"}
          </Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Chip label={statusLabel[status]} color={statusColor[status]} size="small" />
            <CompanionQrButton sessionId={sessionId} />
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

        {/* Most recent answer: large and prominent - this is the one thing that matters mid-interview */}
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
            <Typography variant="h6" color="primary.main" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontWeight: 500 }}>
              {latestTurn.answer}
              {latestTurn.isStreaming && <CircularProgress size={14} sx={{ ml: 1 }} />}
            </Typography>
            {latestTurn.failed && (
              <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                  {error || "Failed to get a response."} The session is still connected — you can retry without
                  restarting the interview.
                </Typography>
                <Button variant="outlined" color="error" size="small" startIcon={<RefreshIcon />} onClick={retryLastResponse}>
                  Retry This Answer
                </Button>
              </Box>
            )}
          </Paper>
        )}

        {/* Earlier turns: compact, muted history below the current answer */}
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
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              {turn.answer}
            </Typography>
          </Paper>
        ))}

        {turns.length === 0 && isActive && (
          <Box display="flex" flexDirection="column" alignItems="center" py={8} color="text.secondary">
            <ScreenShareIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography>Listening to the shared tab — speak your interview question there whenever ready.</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
