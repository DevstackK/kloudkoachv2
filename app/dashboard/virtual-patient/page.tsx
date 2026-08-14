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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import MicIcon from "@mui/icons-material/Mic";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { useVirtualPatient } from "@/hooks/useVirtualPatient";
import { useBeforeUnloadWarning } from "@/hooks/useBeforeUnloadWarning";
import { extractTextFromFile } from "@/lib/extractText";

const statusLabel: Record<string, string> = {
  idle: "Not started",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Patient thinking…",
  speaking: "Patient speaking…",
  diagnosing: "Grading diagnosis…",
  diagnosed: "Diagnosis submitted",
  error: "Error",
  stopped: "Session ended",
};

const statusColor: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  idle: "default",
  connecting: "info",
  listening: "success",
  thinking: "warning",
  speaking: "warning",
  diagnosing: "warning",
  diagnosed: "default",
  error: "error",
  stopped: "default",
};

export default function VirtualPatientPage() {
  const [caseSource, setCaseSource] = React.useState<"generate" | "own">("generate");
  const [specialty, setSpecialty] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<"easy" | "medium" | "hard">("medium");
  const [caseLabel, setCaseLabel] = React.useState("");
  const [caseText, setCaseText] = React.useState("");
  const [uploadedFileName, setUploadedFileName] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");
  const [acceptedDisclaimer, setAcceptedDisclaimer] = React.useState(false);
  const [diagnosisInput, setDiagnosisInput] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { status, interimTranscript, turns, caseTitle, error, sessionId, diagnosisResult, start, submitDiagnosis, stop } =
    useVirtualPatient();

  const isActive = status !== "idle" && status !== "stopped";
  useBeforeUnloadWarning(status === "listening" || status === "thinking" || status === "speaking");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      setUploadError("Only PDF and DOCX files are allowed.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    try {
      const text = await extractTextFromFile(file);
      setCaseText(text);
      setUploadedFileName(file.name);
    } catch {
      setUploadError("Could not read that file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (caseSource === "generate") {
      await start({ specialty: specialty || undefined, difficulty, caseLabel: caseLabel || undefined });
    } else {
      await start({ caseText, caseLabel: caseLabel || undefined });
    }
  };

  const canStart = acceptedDisclaimer && (caseSource === "generate" || caseText.trim().length > 0);

  if (!isActive && status !== "stopped") {
    return (
      <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h5" fontWeight="bold" align="center" color="primary" gutterBottom>
            Virtual Patient
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            An AI standardized patient for diagnostic-interview practice. Ask questions out loud, listen to the
            patient&apos;s spoken answers, and submit your diagnosis when you&apos;re ready.
          </Typography>

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Educational practice only - not a substitute for supervised clinical training.
            </Typography>
            <Typography variant="body2">
              Never upload real patient records or protected health information - only fictional or de-identified
              teaching cases. This tool is meant to help you rehearse diagnostic interviewing, not to replace your
              curriculum or clinical supervisor.
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleStart} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Case source
              </Typography>
              <ToggleButtonGroup
                value={caseSource}
                exclusive
                fullWidth
                onChange={(_, value) => value && setCaseSource(value)}
                size="small"
              >
                <ToggleButton value="generate" sx={{ textTransform: "none" }}>
                  Generate a case for me
                </ToggleButton>
                <ToggleButton value="own" sx={{ textTransform: "none" }}>
                  Use my own case
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              label="Case name (optional, for your history)"
              value={caseLabel}
              onChange={(e) => setCaseLabel(e.target.value)}
              size="small"
              fullWidth
            />

            {caseSource === "generate" ? (
              <>
                <TextField
                  label="Specialty (optional)"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. cardiology, or leave blank for any"
                  fullWidth
                />
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
              </>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Case script (PDF/DOCX, or paste below) - kept private, never shown back to you during the session
                </Typography>
                <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx" onChange={handleFileUpload} />
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  startIcon={isUploading ? <CircularProgress size={16} /> : uploadedFileName ? <CheckCircleIcon color="success" /> : <UploadFileIcon />}
                  sx={{ justifyContent: "flex-start", textTransform: "none", py: 1, mb: 1 }}
                >
                  {isUploading ? "Reading…" : uploadedFileName ? `Using: ${uploadedFileName}` : "Upload a case file"}
                </Button>
                {uploadError && (
                  <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                    {uploadError}
                  </Typography>
                )}
                <TextField
                  label="Or paste the case text"
                  value={caseText}
                  onChange={(e) => {
                    setCaseText(e.target.value);
                    setUploadedFileName(null);
                  }}
                  multiline
                  rows={4}
                  fullWidth
                />
              </Box>
            )}

            <FormControlLabel
              control={<Checkbox checked={acceptedDisclaimer} onChange={(e) => setAcceptedDisclaimer(e.target.checked)} size="small" />}
              label={
                <Typography variant="body2" color="text.secondary">
                  I understand this is practice only, and I won&apos;t upload real patient data.
                </Typography>
              }
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<MedicalServicesIcon />}
              disabled={!canStart}
              sx={{ mt: 1, py: 1.5, borderRadius: "12px" }}
            >
              Meet Your Patient
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          {caseTitle || "Virtual Patient"}
        </Typography>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Chip label={statusLabel[status]} color={statusColor[status]} size="small" />
          {isActive && status !== "diagnosing" && (
            <Button variant="outlined" color="error" size="small" onClick={stop}>
              End Session
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {status === "stopped" && sessionId && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button component={Link} href={`/dashboard/analytics/${sessionId}`} color="inherit" size="small" startIcon={<AssessmentIcon />}>
              View Transcript
            </Button>
          }
        >
          Session ended.
        </Alert>
      )}

      {interimTranscript && (
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
          <Typography variant="caption" color="text.secondary">
            You&apos;re asking…
          </Typography>
          <Typography variant="body2">{interimTranscript}</Typography>
        </Paper>
      )}

      {turns
        .slice()
        .reverse()
        .map((turn, i) => (
          <Paper key={i} elevation={i === 0 ? 2 : 0} sx={{ p: 2.5, mb: 1.5, borderRadius: "14px", border: "1px solid", borderColor: i === 0 ? "primary.main" : "divider" }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
              You: {turn.question}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              Patient: {turn.answer || <CircularProgress size={14} sx={{ ml: 1 }} />}
            </Typography>
          </Paper>
        ))}

      {turns.length === 0 && status === "listening" && (
        <Box display="flex" flexDirection="column" alignItems="center" py={6} color="text.secondary">
          <MicIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography>Ask your patient a question whenever you&apos;re ready.</Typography>
        </Box>
      )}

      {isActive && status !== "diagnosed" && (
        <Paper elevation={0} sx={{ p: 3, mt: 2, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Ready to diagnose?
          </Typography>
          <Box display="flex" gap={1.5}>
            <TextField
              value={diagnosisInput}
              onChange={(e) => setDiagnosisInput(e.target.value)}
              placeholder="Enter your diagnosis…"
              size="small"
              fullWidth
            />
            <Button
              variant="contained"
              disabled={!diagnosisInput.trim() || status === "diagnosing"}
              onClick={() => submitDiagnosis(diagnosisInput)}
              sx={{ textTransform: "none", flexShrink: 0 }}
            >
              Submit
            </Button>
          </Box>
        </Paper>
      )}

      {diagnosisResult && (
        <Paper elevation={2} sx={{ p: 3, mt: 2, borderRadius: "16px", border: "1px solid", borderColor: diagnosisResult.correct ? "success.main" : "error.main" }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography variant="subtitle1" fontWeight={600}>
              {diagnosisResult.correct ? "Correct!" : "Not quite"}
            </Typography>
            <Chip label={`${diagnosisResult.score}/10`} color={diagnosisResult.correct ? "success" : "warning"} sx={{ fontWeight: "bold" }} />
          </Box>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {diagnosisResult.feedback}
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
