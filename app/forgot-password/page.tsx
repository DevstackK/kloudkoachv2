"use client";

import * as React from "react";
import { Box, Typography, TextField, Button, CircularProgress, Alert, Link } from "@mui/material";
import AuthLayout from "@/components/AuthLayout";

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Almost there.">
        <Box sx={{ mb: 4 }}>
          <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
            Check your email
          </Typography>
          <Typography variant="body1" color="text.secondary">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
          </Typography>
        </Box>
        <Link href="/login" variant="body2" sx={{ fontWeight: "bold", textDecoration: "none" }}>
          Back to Sign In
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password? No problem.">
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Reset Password
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Enter the email associated with your account and we&apos;ll send you a reset link.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ width: "100%", mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: "100%" }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
            mb: 3,
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            background: "linear-gradient(90deg, #7b1fa2 0%, #ad1457 100%)",
            boxShadow: "0 4px 12px rgba(123, 31, 162, 0.3)",
          }}
          disabled={isLoading || !validateEmail(email)}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : "Send Reset Link"}
        </Button>

        <Box sx={{ textAlign: "center" }}>
          <Link href="/login" variant="body2" sx={{ fontWeight: "bold", textDecoration: "none" }}>
            Back to Sign In
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
}
