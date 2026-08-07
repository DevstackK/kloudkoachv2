"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Box, Typography, CircularProgress, Chip, Button, Alert } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import MicIcon from "@mui/icons-material/Mic";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import { useCompanionCapture } from "@/hooks/useCompanionCapture";

type LatestData = {
  sessionStatus: string;
  jobRole: string | null;
  latest: { question: string; answer: string | null; at: string } | null;
};

const POLL_INTERVAL_MS = 1500;

export default function CompanionPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = React.useState<LatestData | null>(null);
  const [pollError, setPollError] = React.useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = React.useState<string | null>(null);
  const [micUnsupported, setMicUnsupported] = React.useState(false);

  const capture = useCompanionCapture(token);
  const isListening = capture.status !== "idle" && capture.status !== "stopped";

  // Mirror mode: poll the laptop-driven session for its latest turn.
  // Paused once this device takes over listening itself, so the two
  // sources don't fight over the same "latest" display.
  React.useEffect(() => {
    if (isListening) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/companion/${token}/latest`);
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json.success) {
          setPollError(json.message || "This pairing link is no longer valid.");
          return;
        }
        setPollError(null);
        setData(json.data);
        if (json.data.latest?.at) setLastSeenAt(json.data.latest.at);
      } catch {
        if (!cancelled) setPollError("Connection lost. Retrying…");
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, isListening]);

  const handleTakeOver = () => {
    if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      setMicUnsupported(true);
      return;
    }
    capture.start();
  };

  const latestTurn = capture.turns[capture.turns.length - 1];
  const earlierTurns = capture.turns.slice(0, -1).reverse();
  const sessionEnded = data?.sessionStatus === "completed";

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "#0e0e14",
        color: "white",
        display: "flex",
        flexDirection: "column",
        p: 3,
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <SmartToyIcon sx={{ color: "#ce93d8" }} />
        <Typography variant="subtitle2" sx={{ opacity: 0.7 }}>
          Kloud Koach Companion
        </Typography>
        <Chip
          label={isListening ? "Listening on this phone" : sessionEnded ? "Session ended" : "Mirroring laptop"}
          size="small"
          sx={{ ml: "auto", bgcolor: isListening ? "#2e7d32" : sessionEnded ? "grey.700" : "#455a64", color: "white" }}
        />
      </Box>

      {!isListening && !sessionEnded && (
        <Button
          variant="contained"
          startIcon={<MicIcon />}
          onClick={handleTakeOver}
          disabled={capture.status === "connecting"}
          sx={{ mb: 2, bgcolor: "#7b1fa2", "&:hover": { bgcolor: "#6a1b9a" } }}
        >
          {capture.status === "connecting" ? "Starting…" : "Take Over Listening on This Phone"}
        </Button>
      )}

      {!isListening && !sessionEnded && (
        <Typography variant="caption" sx={{ opacity: 0.5, mb: 2 }}>
          Use this if you need to share your laptop screen — hold your phone where it can hear the call, and pause
          or stop the mic/tab capture on your laptop so answers aren&apos;t duplicated.
        </Typography>
      )}

      {isListening && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<StopCircleIcon />}
          onClick={capture.stop}
          sx={{ mb: 2, alignSelf: "flex-start", color: "white", borderColor: "rgba(255,255,255,0.3)" }}
        >
          Stop Listening
        </Button>
      )}

      {micUnsupported && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This phone&apos;s browser doesn&apos;t support live audio capture. Try Chrome on Android, or a recent
          Safari on iOS.
        </Alert>
      )}

      {capture.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {capture.error}
        </Alert>
      )}

      {pollError && !isListening && (
        <Typography variant="body2" sx={{ color: "#f28b82", mb: 2 }}>
          {pollError}
        </Typography>
      )}

      {isListening ? (
        <>
          {capture.interimTranscript && (
            <Box sx={{ p: 2, mb: 2, borderRadius: "12px", bgcolor: "rgba(123,31,162,0.15)" }}>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
                Listening…
              </Typography>
              <Typography variant="body2">{capture.interimTranscript}</Typography>
            </Box>
          )}

          {latestTurn ? (
            <Box flex={1} display="flex" flexDirection="column" justifyContent="center">
              <Typography variant="body2" sx={{ opacity: 0.6, mb: 1.5, lineHeight: 1.4 }}>
                {latestTurn.question}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.45, color: "#e1bee7" }}>
                {latestTurn.answer}
                {latestTurn.isStreaming && <CircularProgress size={16} sx={{ ml: 1.5, color: "#e1bee7" }} />}
              </Typography>
            </Box>
          ) : (
            <Box flex={1} display="flex" alignItems="center" justifyContent="center" textAlign="center" px={4}>
              <Typography variant="body1" sx={{ opacity: 0.6 }}>
                {capture.status === "listening" ? "Listening — ask or wait for the next question…" : "Connecting…"}
              </Typography>
            </Box>
          )}

          {earlierTurns.map((turn, i) => (
            <Box key={i} sx={{ p: 2, mb: 1.5, borderRadius: "12px", bgcolor: "rgba(255,255,255,0.06)" }}>
              <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 600, mb: 0.5 }}>
                {turn.question}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                {turn.answer}
              </Typography>
            </Box>
          ))}
        </>
      ) : (
        <>
          {!data && !pollError && (
            <Box flex={1} display="flex" alignItems="center" justifyContent="center">
              <CircularProgress sx={{ color: "#ce93d8" }} />
            </Box>
          )}

          {data?.latest ? (
            <Box flex={1} display="flex" flexDirection="column" justifyContent="center">
              <Typography variant="body2" sx={{ opacity: 0.6, mb: 1.5, lineHeight: 1.4 }}>
                {data.latest.question}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.45, color: "#e1bee7" }}>
                {data.latest.answer}
              </Typography>
              {lastSeenAt && (
                <Typography variant="caption" sx={{ opacity: 0.4, mt: 3 }}>
                  Updated {new Date(lastSeenAt).toLocaleTimeString()}
                </Typography>
              )}
            </Box>
          ) : (
            data && (
              <Box flex={1} display="flex" alignItems="center" justifyContent="center" textAlign="center" px={4}>
                <Typography variant="body1" sx={{ opacity: 0.6 }}>
                  Connected. Waiting for the first question…
                </Typography>
              </Box>
            )
          )}
        </>
      )}
    </Box>
  );
}
