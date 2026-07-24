"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Box, Typography, CircularProgress, Chip } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";

type LatestData = {
  sessionStatus: string;
  jobRole: string | null;
  latest: { question: string; answer: string | null; at: string } | null;
};

const POLL_INTERVAL_MS = 1500;

export default function CompanionPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = React.useState<LatestData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/companion/${params.token}/latest`);
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json.success) {
          setError(json.message || "This pairing link is no longer valid.");
          return;
        }
        setError(null);
        setData(json.data);
        if (json.data.latest?.at) setLastSeenAt(json.data.latest.at);
      } catch {
        if (!cancelled) setError("Connection lost. Retrying…");
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [params.token]);

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
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <SmartToyIcon sx={{ color: "#ce93d8" }} />
        <Typography variant="subtitle2" sx={{ opacity: 0.7 }}>
          Kloud Koach Companion
        </Typography>
        {data && (
          <Chip
            label={data.sessionStatus === "completed" ? "Session ended" : "Live"}
            size="small"
            sx={{ ml: "auto", bgcolor: data.sessionStatus === "completed" ? "grey.700" : "#2e7d32", color: "white" }}
          />
        )}
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: "#f28b82", mb: 2 }}>
          {error}
        </Typography>
      )}

      {!data && !error && (
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
    </Box>
  );
}
