"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, TextField, Button, CircularProgress, Alert, Link } from "@mui/material";
import AuthLayout from "@/components/AuthLayout";

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"email" | "reset">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStep("reset");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
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
        body: JSON.stringify({ email, code, newPassword }),
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

  if (step === "email") {
    return (
      <AuthLayout title="Forgot your password? No problem.">
        <Box sx={{ mb: 4 }}>
          <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
            Reset Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter the email associated with your account and we&apos;ll send you a code.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSendCode} noValidate sx={{ width: "100%" }}>
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
            {isLoading ? <CircularProgress size={24} color="inherit" /> : "Send Code"}
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

  return (
    <AuthLayout title="Check your email.">
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Enter Your Code
        </Typography>
        <Typography variant="body1" color="text.secondary">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a 6-digit code.
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

      <Box component="form" onSubmit={handleReset} noValidate sx={{ width: "100%" }}>
        <TextField
          margin="normal"
          required
          fullWidth
          label="Verification Code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={isLoading}
          inputProps={{ maxLength: 6, inputMode: "numeric" }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" }, "& input": { letterSpacing: "0.5em", textAlign: "center" } }}
        />
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
            mb: 2,
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            background: "linear-gradient(90deg, #7b1fa2 0%, #ad1457 100%)",
            boxShadow: "0 4px 12px rgba(123, 31, 162, 0.3)",
          }}
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
        </Button>

        <Box sx={{ textAlign: "center" }}>
          <Link component="button" type="button" variant="body2" onClick={() => setStep("email")} sx={{ fontWeight: "bold" }}>
            Use a different email
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
}
