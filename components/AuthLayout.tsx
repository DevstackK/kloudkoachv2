"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Box, Grid, Typography, Paper, useTheme, IconButton, Tooltip } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function AuthLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Grid container component="main" sx={{ height: "100vh", overflow: "hidden", position: "relative" }}>
      <Tooltip title="Back to Home">
        <IconButton
          onClick={() => router.push("/")}
          sx={{
            position: "absolute",
            top: 24,
            left: 24,
            zIndex: 10,
            color: { xs: "text.primary", sm: "white" },
            bgcolor: { xs: "rgba(0,0,0,0.05)", sm: "rgba(255,255,255,0.15)" },
            backdropFilter: "blur(5px)",
            transition: "all 0.2s",
            "&:hover": {
              bgcolor: { xs: "rgba(0,0,0,0.1)", sm: "rgba(255,255,255,0.3)" },
              transform: "translateX(-3px)",
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Tooltip>

      <Grid
        item
        xs={false}
        sm={4}
        md={5}
        lg={4}
        sx={{
          background: "linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%)",
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "white",
          p: 4,
          position: "relative",
        }}
      >
        <Box sx={{ position: "absolute", top: -50, left: -50, width: 200, height: 200, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.1)" }} />

        <Box sx={{ zIndex: 1, textAlign: "center" }}>
          <Box sx={{ bgcolor: "rgba(255,255,255,0.15)", p: 2, borderRadius: "20px", display: "inline-flex", mb: 3 }}>
            <SmartToyIcon sx={{ fontSize: 60 }} />
          </Box>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Kloud Koach
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, maxWidth: 300, mx: "auto", lineHeight: 1.6 }}>
            {title || "Your AI-powered companion for career success."}
          </Typography>
        </Box>
      </Grid>

      <Grid
        item
        xs={12}
        sm={8}
        md={7}
        lg={8}
        component={Paper}
        elevation={0}
        square
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.palette.mode === "light" ? "#f8f9fa" : "#121212",
        }}
      >
        <Box sx={{ my: 8, mx: 4, display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", maxWidth: "450px" }}>
          {children}
        </Box>
      </Grid>
    </Grid>
  );
}
