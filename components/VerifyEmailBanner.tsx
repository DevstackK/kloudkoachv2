"use client";

import NextLink from "next/link";
import { Alert, Box } from "@mui/material";
import { useAuth } from "@/lib/AuthProvider";

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  if (!user || user.emailVerified) return null;

  return (
    <Alert severity="warning" sx={{ borderRadius: 0 }}>
      <Box component="span">
        Please verify your email address.{" "}
        <Box component={NextLink} href="/verify-email" sx={{ fontWeight: 700, color: "inherit" }}>
          Enter your code
        </Box>
      </Box>
    </Alert>
  );
}
