"use client";

import * as React from "react";
import NextLink from "next/link";
import { Container, Paper, Typography, Box, Chip, CircularProgress, List, ListItemButton, ListItemText } from "@mui/material";
import { fetchWithAuthRetry } from "@/lib/fetchWithAuthRetry";

type SessionRow = {
  id: string;
  type:
    | "live_interview"
    | "mock_interview"
    | "exam_prep"
    | "ai_interview"
    | "pronunciation_practice"
    | "virtual_patient"
    | "meeting_helper";
  jobRole: string | null;
  status: string;
  startedAt: string;
  durationMinutes: number | null;
  averageScore: number | null;
};

const typeLabel: Record<SessionRow["type"], string> = {
  live_interview: "Live Interview",
  mock_interview: "Mock Interview",
  exam_prep: "Exam Prep",
  ai_interview: "AI Interviewer",
  pronunciation_practice: "Pronunciation Practice",
  virtual_patient: "Virtual Patient",
  meeting_helper: "Meeting Helper",
};

export default function SessionHistoryPage() {
  const [sessions, setSessions] = React.useState<SessionRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuthRetry("/api/coach/session/history", { credentials: "include" });
        const json = await res.json();
        if (json.success) setSessions(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Container sx={{ py: 10, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Session History
      </Typography>

      {sessions.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
          <Typography color="text.secondary">No sessions yet. Start a practice interview to see it here.</Typography>
        </Paper>
      ) : (
        <List sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {sessions.map((s) => (
            <Paper key={s.id} elevation={0} sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
              <ListItemButton component={NextLink} href={`/dashboard/analytics/${s.id}`} sx={{ borderRadius: "16px", p: 2 }}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontWeight={600}>{s.jobRole || typeLabel[s.type]}</Typography>
                      <Chip label={typeLabel[s.type]} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <>
                      {new Date(s.startedAt).toLocaleString()}
                      {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                      {s.averageScore !== null ? ` · Score: ${s.averageScore.toFixed(1)}/10` : ""}
                    </>
                  }
                />
              </ListItemButton>
            </Paper>
          ))}
        </List>
      )}
    </Container>
  );
}
