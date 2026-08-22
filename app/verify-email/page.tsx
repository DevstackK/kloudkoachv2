"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, TextField, Button, CircularProgress, Alert, Link } from "@mui/material";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthProvider";

export default function VerifyEmailPage() {
  const { user, loading: authLoading, logout, refresh } = useAuth();
  const router = useRouter();

  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.emailVerified) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Could not verify that code.");
        return;
      }
      await refresh();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/resend-otp", { method: "POST", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Could not resend the code.");
        return;
      }
      setMessage("A new code is on its way.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (authLoading || !user || user.emailVerified) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthLayout title="One quick step before you get started.">
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Verify your email
        </Typography>
        <Typography variant="body1" color="text.secondary">
          We sent a 6-digit code to <strong>{user.email}</strong>. Enter it below to activate your account.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ width: "100%", mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ width: "100%", mb: 3, borderRadius: 2 }}>
          {message}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: "100%" }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="code"
          label="Verification code"
          name="code"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={isSubmitting}
          inputProps={{ inputMode: "numeric", maxLength: 6, style: { letterSpacing: "0.5em", fontSize: "1.25rem", textAlign: "center" } }}
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
          disabled={isSubmitting || code.length !== 6}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Verify"}
        </Button>

        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Didn&apos;t get it?{" "}
            <Link component="button" type="button" onClick={handleResend} variant="body2" sx={{ fontWeight: "bold", textDecoration: "none" }} disabled={isResending}>
              {isResending ? "Sending..." : "Resend code"}
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wrong account?{" "}
            <Link component="button" type="button" onClick={() => logout().then(() => router.push("/login"))} variant="body2" sx={{ fontWeight: "bold", textDecoration: "none" }}>
              Sign out
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
}
