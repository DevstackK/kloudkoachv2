"use client";

import { Container, Paper, Typography, Button, Box } from "@mui/material";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import HistoryIcon from "@mui/icons-material/History";
import NextLink from "next/link";

// Virtual Patient was spun out into its own dedicated product, RehearseMD
// (rehearsemd.vercel.app) - purpose-built for medical students, with a
// scenario browser, suggested-questions panel, and multilingual support
// that don't make sense bolted onto KloudKoach's interview-coaching
// audience. Old session history/transcripts (from before the move) are
// still viewable via History - only starting new sessions has moved.
export default function VirtualPatientMovedPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 10, flex: 1 }}>
      <Paper elevation={0} sx={{ p: 5, textAlign: "center", borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
        <MedicalServicesIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Virtual Patient has moved
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          It&apos;s now RehearseMD - a dedicated app for medical students, with a browsable scenario bank,
          suggested-questions coaching, and multilingual support built in.
        </Typography>
        <Box display="flex" flexDirection="column" gap={1.5} alignItems="center">
          <Button
            href="https://rehearsemd.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            size="large"
            startIcon={<OpenInNewIcon />}
            sx={{ borderRadius: "12px", py: 1.5, px: 4 }}
          >
            Open RehearseMD
          </Button>
          <Button component={NextLink} href="/dashboard/history" startIcon={<HistoryIcon />} sx={{ textTransform: "none" }}>
            View my past Virtual Patient sessions
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
