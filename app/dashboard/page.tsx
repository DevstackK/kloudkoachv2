"use client";

import * as React from "react";
import NextLink from "next/link";
import { Container, Grid, Typography, Card, CardActionArea, CardContent, Box, useTheme, Chip } from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SchoolIcon from "@mui/icons-material/School";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import LockIcon from "@mui/icons-material/Lock";
import ConstructionIcon from "@mui/icons-material/Construction";
import { useAuth } from "@/lib/AuthProvider";

const options = [
  {
    title: "Live Interview Co-Pilot",
    description: "Start a real-time interview session with our AI.",
    path: "/dashboard/interview",
    featureCode: "LIVE_INTERVIEW",
    icon: <RecordVoiceOverIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: "Interview Preparation",
    description: "Prepare for your interview with targeted practice.",
    path: "/dashboard/interview-preparation",
    featureCode: "MOCK_INTERVIEW",
    icon: <ModelTrainingIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: "AI Interviewer",
    description: "A simulated interviewer asks you real questions out loud - you answer by speaking.",
    path: "/dashboard/ai-interviewer",
    featureCode: "MOCK_INTERVIEW",
    icon: <HeadsetMicIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: "AI Resume Builder",
    description: "Build, optimize, and export ATS-friendly resumes instantly.",
    path: "/dashboard/resume-builder",
    featureCode: "RESUME_BUILDER",
    icon: <AutoFixHighIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: "Exam Preparation",
    description: "Generate an AI-powered practice exam for any subject.",
    path: "/dashboard/exam-preparation",
    featureCode: "EXAM_PREP",
    icon: <SchoolIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: "Pronunciation Practice",
    description: "Read a sentence aloud and get instant word-by-word pronunciation scoring.",
    path: "/dashboard/pronunciation",
    featureCode: "MOCK_INTERVIEW",
    icon: <GraphicEqIcon sx={{ fontSize: 40 }} />,
    // Built and tested against the Speechace API, just waiting on the
    // production API key - flip off once SPEECHACE_API_KEY is set
    // (matches the COMING_SOON flag in the page itself).
    comingSoon: true,
  },
];

export default function DashboardHomePage() {
  const theme = useTheme();
  const { user, checkAccess } = useAuth();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box mb={4} textAlign="center">
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800, color: "primary.main" }}>
          Welcome back, {user?.name?.split(" ")[0] || "User"}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ready to accelerate your career? Select a module below.
        </Typography>
      </Box>

      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {options.map((option) => {
          const isAllowed = !option.comingSoon && checkAccess(option.featureCode);

          return (
            <Grid item key={option.title} xs={12} sm={6} md={4} sx={{ display: "flex" }}>
              <Card
                elevation={0}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  bgcolor: "background.paper",
                  transition: "all 0.3s ease-in-out",
                  opacity: isAllowed ? 1 : 0.75,
                  filter: isAllowed ? "none" : "grayscale(90%)",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    filter: "none",
                    opacity: 1,
                    borderColor: isAllowed ? "primary.main" : "secondary.main",
                  },
                }}
              >
                <CardActionArea
                  component={NextLink}
                  href={option.comingSoon ? option.path : isAllowed ? option.path : "/dashboard/upgrade"}
                  sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start" }}
                >
                  <CardContent sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", flexGrow: 1 }}>
                    <Box
                      sx={{
                        mb: 2,
                        p: 2,
                        borderRadius: "50%",
                        bgcolor: isAllowed ? (theme.palette.mode === "dark" ? "primary.dark" : "primary.light") : "grey.300",
                        color: "white",
                      }}
                    >
                      {isAllowed ? option.icon : option.comingSoon ? <ConstructionIcon fontSize="large" /> : <LockIcon fontSize="large" />}
                    </Box>

                    <Typography gutterBottom variant="h6" component="div" sx={{ fontWeight: "bold", color: "text.primary" }}>
                      {option.title}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {option.description}
                    </Typography>

                    {option.comingSoon ? (
                      <Chip label="Coming Soon" size="small" color="default" variant="filled" sx={{ mt: "auto", fontWeight: "bold" }} />
                    ) : (
                      !isAllowed && (
                        <Chip label="Upgrade Plan" size="small" color="secondary" variant="filled" sx={{ mt: "auto", fontWeight: "bold" }} />
                      )
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
}
