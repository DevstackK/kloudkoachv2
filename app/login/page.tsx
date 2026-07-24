"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Typography, TextField, Button, CircularProgress, Alert, Link, Divider } from "@mui/material";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthProvider";

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.ok) {
        router.push(searchParams.get("next") || "/dashboard");
      } else {
        setError(result.message || "Invalid email or password");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back! Ready to ace your next interview?">
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Sign In
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Enter your details to access your dashboard.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ width: "100%", mb: 3, borderRadius: 2 }}>
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
          error={email !== "" && !validateEmail(email)}
          helperText={email !== "" && !validateEmail(email) ? "Enter a valid email address" : ""}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
        />

        <Box sx={{ textAlign: "right", mt: 1, mb: 2 }}>
          <Link href="/forgot-password" variant="body2" sx={{ textDecoration: "none", fontWeight: 500, cursor: "pointer" }}>
            Forgot Password?
          </Link>
        </Box>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{
            mt: 2,
            mb: 3,
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            background: "linear-gradient(90deg, #7b1fa2 0%, #ad1457 100%)",
            boxShadow: "0 4px 12px rgba(123, 31, 162, 0.3)",
          }}
          disabled={isLoading || !email || !password || !validateEmail(email)}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
        </Button>

        <Divider sx={{ my: 3 }}>OR</Divider>

        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Don&apos;t have an account?{" "}
            <Link href="/register" variant="body2" sx={{ fontWeight: "bold", textDecoration: "none" }}>
              Create one
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}
