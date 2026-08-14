"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Container, Paper, Typography, Box, Chip, CircularProgress, Divider, LinearProgress, Alert, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { fetchWithAuthRetry } from "@/lib/fetchWithAuthRetry";

const typeLabel: Record<string, string> = {
  live_interview: "Live Interview",
  mock_interview: "Interview Preparation",
  ai_interview: "AI Interviewer",
  exam_prep: "Exam Prep",
};

type Interaction = {
  id: string;
  questionText: string;
  suggestedAnswer: string | null;
  userAnswerText: string | null;
  rating: number | null;
  feedback: string | null;
};

type SessionDetail = {
  id: string;
  type: string;
  jobRole: string | null;
  status: string;
  startedAt: string;
  durationMinutes: number | null;
  averageScore: number | null;
  interactions: Interaction[];
};

export default function SessionAnalyticsPage() {
  const params = useParams<{ sessionId: string }>();
  const [session, setSession] = React.useState<SessionDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        // A long live-interview session can easily outlast the short-lived
        // access-token cookie, so the very first click on "View Transcript"
        // right after such a session can hit a stale 401 - retry with a
        // silent token refresh before giving up.
        const res = await fetchWithAuthRetry(`/api/coach/session/${params.sessionId}`, { credentials: "include" });
        const json = await res.json();
        if (json.success) {
          setSession(json.data);
        } else {
          setLoadError(json.message || "Session not found.");
        }
      } catch {
        setLoadError("Could not load this session. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.sessionId]);

  if (loading) {
    return (
      <Container sx={{ py: 10, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Alert severity="error">{loadError || "Session not found."}</Alert>
      </Container>
    );
  }

  const handleDownload = () => {
    const lines: string[] = [];
    lines.push(session.jobRole || "Kloud Koach Session");
    lines.push(`${typeLabel[session.type] || session.type} · ${new Date(session.startedAt).toLocaleString()}`);
    if (session.durationMinutes) lines.push(`Duration: ${session.durationMinutes} min`);
    if (session.averageScore !== null) lines.push(`Average score: ${session.averageScore.toFixed(1)}/10`);
    lines.push("");
    lines.push("=".repeat(60));

    session.interactions.forEach((turn, i) => {
      lines.push("");
      lines.push(`Q${i + 1}: ${turn.questionText}`);
      if (turn.suggestedAnswer) {
        lines.push("");
        lines.push(`Suggested answer: ${turn.suggestedAnswer}`);
      }
      if (turn.userAnswerText) {
        lines.push("");
        lines.push(`Your answer: ${turn.userAnswerText}`);
      }
      if (turn.rating !== null) {
        lines.push("");
        lines.push(`Rating: ${turn.rating}/10`);
        if (turn.feedback) lines.push(`Feedback: ${turn.feedback}`);
      }
      lines.push("-".repeat(60));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeRole = (session.jobRole || "session").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    a.href = url;
    a.download = `kloudkoach-transcript-${safeRole || "session"}-${session.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="md" sx={{ py: 6, flex: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} gap={2}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {session.jobRole || "Session"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(session.startedAt).toLocaleString()}
            {session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1.5} flexShrink={0}>
          {session.averageScore !== null && (
            <Chip label={`${session.averageScore.toFixed(1)}/10 average`} color="primary" sx={{ fontWeight: "bold" }} />
          )}
          {session.interactions.length > 0 && (
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleDownload} sx={{ textTransform: "none" }}>
              Download
            </Button>
          )}
        </Box>
      </Box>

      {session.interactions.length === 0 ? (
        <Typography color="text.secondary">No questions were recorded in this session.</Typography>
      ) : (
        session.interactions.map((turn) => (
          <Paper key={turn.id} elevation={0} sx={{ p: 3, mb: 2, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              {turn.questionText}
            </Typography>
            {turn.suggestedAnswer && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: "pre-wrap" }}>
                {turn.suggestedAnswer}
              </Typography>
            )}
            {turn.userAnswerText && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Your answer
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {turn.userAnswerText}
                </Typography>
              </Box>
            )}
            {turn.rating !== null && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Typography variant="caption" fontWeight="bold" sx={{ minWidth: 60 }}>
                    {turn.rating}/10
                  </Typography>
                  <LinearProgress variant="determinate" value={turn.rating * 10} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                </Box>
                {turn.feedback && (
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                    {turn.feedback}
                  </Typography>
                )}
              </>
            )}
          </Paper>
        ))
      )}
    </Container>
  );
}
