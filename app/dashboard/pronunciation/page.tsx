"use client";

import * as React from "react";
import Link from "next/link";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { usePronunciationPractice, type Difficulty } from "@/hooks/usePronunciationPractice";
import { useBeforeUnloadWarning } from "@/hooks/useBeforeUnloadWarning";
import ComingSoon from "@/components/ComingSoon";

function wordColor(score: number) {
  if (score >= 80) return "success.main";
  if (score >= 60) return "warning.main";
  return "error.main";
}

// Flip to false once SPEECHACE_API_KEY is set in production - the feature
// is fully built and tested against the documented API, just waiting on
// the key.
const COMING_SOON = true;

export default function PronunciationPracticePage() {
  const [difficulty, setDifficulty] = React.useState<Difficulty>("medium");
  const [acceptedDisclaimer, setAcceptedDisclaimer] = React.useState(false);
  const { status, promptText, result, error, promptCount, start, startRecording, stopRecording, nextPrompt, stop } =
    usePronunciationPractice();

  const isActive = status !== "idle" && status !== "stopped";
  useBeforeUnloadWarning(status === "recording" || status === "scoring");

  if (COMING_SOON) {
    return (
      <ComingSoon
        title="Pronunciation Practice"
        phaseNote="Read a sentence aloud and get instant word-by-word pronunciation scoring. We're finishing setup on the scoring engine - check back soon."
      />
    );
  }

  if (!isActive && status !== "stopped") {
    return (
      <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h5" fontWeight="bold" align="center" color="primary" gutterBottom>
            Pronunciation Practice
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Read a sentence out loud and get instant word-by-word pronunciation scoring, powered by Speechace.
          </Typography>

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              This is a practice tool for building confidence, not a certified language assessment. Scores are
              automated and may not always be perfectly accurate.
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Difficulty
            </Typography>
            <ToggleButtonGroup
              value={difficulty}
              exclusive
              fullWidth
              onChange={(_, value) => value && setDifficulty(value)}
              size="small"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="easy" sx={{ textTransform: "none" }}>
                Easy
              </ToggleButton>
              <ToggleButton value="medium" sx={{ textTransform: "none" }}>
                Medium
              </ToggleButton>
              <ToggleButton value="hard" sx={{ textTransform: "none" }}>
                Hard
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <FormControlLabel
            control={<Checkbox checked={acceptedDisclaimer} onChange={(e) => setAcceptedDisclaimer(e.target.checked)} size="small" />}
            label={
              <Typography variant="body2" color="text.secondary">
                I understand this is practice, not a certified assessment.
              </Typography>
            }
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<RecordVoiceOverIcon />}
            disabled={!acceptedDisclaimer}
            onClick={() => start(difficulty)}
            sx={{ mt: 1, py: 1.5, borderRadius: "12px" }}
          >
            Start Practicing
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4, flex: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          Pronunciation Practice
        </Typography>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Chip label={`Sentence ${promptCount}`} size="small" variant="outlined" />
          <Button variant="outlined" color="error" size="small" onClick={stop}>
            End Session
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {status === "loadingPrompt" ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : status !== "stopped" ? (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: "18px", border: "1px solid", borderColor: "primary.main" }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Read this out loud
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.5, fontWeight: 500 }}>
            {promptText}
          </Typography>

          <Box display="flex" justifyContent="center" mt={3}>
            {status === "recording" ? (
              <Button variant="contained" color="error" size="large" startIcon={<StopIcon />} onClick={stopRecording} sx={{ borderRadius: "12px" }}>
                Stop Recording
              </Button>
            ) : status === "scoring" ? (
              <Button variant="contained" disabled startIcon={<CircularProgress size={16} color="inherit" />} sx={{ borderRadius: "12px" }}>
                Scoring…
              </Button>
            ) : (
              <Button variant="contained" size="large" startIcon={<MicIcon />} onClick={startRecording} sx={{ borderRadius: "12px" }}>
                {result ? "Record Again" : "Start Recording"}
              </Button>
            )}
          </Box>
        </Paper>
      ) : null}

      {result && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Score
            </Typography>
            <Chip
              label={`${result.overallScore}/100`}
              color={result.overallScore >= 80 ? "success" : result.overallScore >= 60 ? "warning" : "error"}
              sx={{ fontWeight: "bold" }}
            />
          </Box>

          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {result.words.map((w, i) => (
              <Chip key={i} label={`${w.word} ${w.score}`} size="small" sx={{ bgcolor: wordColor(w.score), color: "white", fontWeight: 500 }} />
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary">
            {result.feedback}
          </Typography>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<SkipNextIcon />}
            onClick={nextPrompt}
            sx={{ mt: 2, textTransform: "none", borderRadius: "12px" }}
          >
            Next Sentence
          </Button>
        </Paper>
      )}

      {status === "stopped" && (
        <Alert severity="info">
          Session ended.{" "}
          <Link href="/dashboard/history" style={{ color: "inherit", fontWeight: 600 }}>
            View your history
          </Link>{" "}
          to see it again.
        </Alert>
      )}
    </Container>
  );
}
