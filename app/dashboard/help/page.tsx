"use client";

import * as React from "react";
import NextLink from "next/link";
import { Container, Paper, Typography, Box, Divider, List, ListItemButton, ListItemText, ListItemIcon, Button } from "@mui/material";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import MicIcon from "@mui/icons-material/Mic";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import HistoryIcon from "@mui/icons-material/History";
import StarIcon from "@mui/icons-material/Star";
import DownloadIcon from "@mui/icons-material/Download";

const quickLinks = [
  { title: "Live Interview Co-Pilot", path: "/dashboard/interview", icon: <ScreenShareIcon fontSize="small" /> },
  { title: "Interview Preparation", path: "/dashboard/interview-preparation", icon: <MicIcon fontSize="small" /> },
  { title: "AI Interviewer", path: "/dashboard/ai-interviewer", icon: <RecordVoiceOverIcon fontSize="small" /> },
  { title: "Resume Builder", path: "/dashboard/resume-builder", icon: <UploadFileIcon fontSize="small" /> },
  { title: "Session History", path: "/dashboard/history", icon: <HistoryIcon fontSize="small" /> },
  { title: "Upgrade Plan", path: "/dashboard/upgrade", icon: <StarIcon fontSize="small" /> },
];

export default function HelpPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6, flex: 1 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        How to Use Kloud Koach
      </Typography>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          A quick two-minute tour of every coaching tool, from creating your account to reviewing your transcripts.
        </Typography>
        <Button
          href="/tutorial/kloudkoach-tutorial.mp4"
          download
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          sx={{ textTransform: "none", flexShrink: 0 }}
        >
          Download
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", overflow: "hidden", mb: 3 }}
      >
        <Box
          component="video"
          controls
          preload="metadata"
          poster="/tutorial/poster.jpg"
          sx={{ width: "100%", display: "block", bgcolor: "black" }}
        >
          <source src="/tutorial/kloudkoach-tutorial.mp4" type="video/mp4" />
          <track kind="captions" src="/tutorial/captions.vtt" srcLang="en" label="English" default />
          Your browser doesn&apos;t support embedded video. You can download the tutorial{" "}
          <a href="/tutorial/kloudkoach-tutorial.mp4">here</a>.
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Jump to a feature
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <List dense>
          {quickLinks.map((link) => (
            <ListItemButton key={link.path} component={NextLink} href={link.path} sx={{ borderRadius: "10px" }}>
              <ListItemIcon sx={{ minWidth: 36 }}>{link.icon}</ListItemIcon>
              <ListItemText primary={link.title} primaryTypographyProps={{ variant: "body2" }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Container>
  );
}
