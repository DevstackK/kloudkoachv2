"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, TextField, Button, CircularProgress, Alert, Link } from "@mui/material";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthProvider";

export default function VerifyEmailPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [info, setInfo] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);

  React.useEffect(() => {
    if (user?.emailVerified) router.replace("/dashboard");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Could not verify email.");
        return;
      }
      await refresh();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Could not resend code.");
        return;
      }
      setInfo("A new code has been sent.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout title="Almost there.">
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Verify Your Email
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Enter the 6-digit code we sent to <strong>{user?.email}</strong>.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ width: "100%", mb: 3 }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ width: "100%", mb: 3 }}>
          {info}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: "100%" }}>
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
          {isLoading ? <CircularProgress size={24} color="inherit" /> : "Verify Email"}
        </Button>

        <Box sx={{ textAlign: "center" }}>
          <Link component="button" type="button" variant="body2" onClick={handleResend} disabled={isResending} sx={{ fontWeight: "bold" }}>
            {isResending ? "Sending…" : "Resend code"}
          </Link>
        </Box>
      </Box>
    </AuthLayout>
  );
}
