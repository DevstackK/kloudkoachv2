"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Container, Paper, Typography, Box, Chip, CircularProgress, Divider, LinearProgress } from "@mui/material";

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

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/coach/session/${params.sessionId}`, { credentials: "include" });
        const json = await res.json();
        if (json.success) setSession(json.data);
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
      <Container sx={{ py: 10 }}>
        <Typography align="center" color="text.secondary">
          Session not found.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6, flex: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {session.jobRole || "Session"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(session.startedAt).toLocaleString()}
            {session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}
          </Typography>
        </Box>
        {session.averageScore !== null && (
          <Chip label={`${session.averageScore.toFixed(1)}/10 average`} color="primary" sx={{ fontWeight: "bold" }} />
        )}
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
                  <Typography variant="body2" color="text.secondary">
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
