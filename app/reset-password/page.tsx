"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Typography, TextField, Button, CircularProgress, Alert } from "@mui/material";
import AuthLayout from "@/components/AuthLayout";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Could not reset password.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Reset link required.">
        <Alert severity="error" sx={{ width: "100%" }}>
          This page requires a valid reset link. Please request a new one from the forgot password page.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password.">
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Set New Password
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ width: "100%", mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ width: "100%", mb: 3 }}>
          Password updated. Redirecting to sign in&hellip;
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: "100%" }}>
        <TextField
          margin="normal"
          required
          fullWidth
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{
            mt: 3,
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            background: "linear-gradient(90deg, #7b1fa2 0%, #ad1457 100%)",
            boxShadow: "0 4px 12px rgba(123, 31, 162, 0.3)",
          }}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
        </Button>
      </Box>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
