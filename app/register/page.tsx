"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Typography, TextField, Button, CircularProgress, Alert, Link } from "@mui/material";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthProvider";

function RegisterForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(name, email, password);
      if (!result.ok) {
        setError(result.message || "Registration failed. Please try again.");
        return;
      }

      if (planId) {
        try {
          const plansRes = await fetch("/api/plans");
          const plansJson = await plansRes.json();
          const selectedPlan = plansJson.data?.find((p: { subscriptionPlanId: string }) => p.subscriptionPlanId === planId);

          if (selectedPlan && selectedPlan.price > 0) {
            const checkoutRes = await fetch("/api/billing/create-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ planId }),
            });
            const checkoutJson = await checkoutRes.json();
            if (checkoutRes.ok && checkoutJson.success && checkoutJson.data?.url) {
              window.location.href = checkoutJson.data.url;
              return;
            }
            // Checkout unavailable (e.g. Stripe not configured yet) - fall through to dashboard.
          }
        } catch {
          // Non-fatal - land in the dashboard on the free plan if checkout can't be started.
        }
      }

      router.push("/dashboard");
    } catch {
      setError("Registration error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Join thousands of candidates acing their interviews.">
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Create Account
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Get started with your free Kloud Koach account.
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
          id="name"
          label="Full Name"
          name="name"
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          helperText="At least 8 characters"
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{
            mt: 4,
            mb: 3,
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            background: "linear-gradient(90deg, #7b1fa2 0%, #ad1457 100%)",
            boxShadow: "0 4px 12px rgba(123, 31, 162, 0.3)",
          }}
          disabled={isLoading || !name || !email || password.length < 8}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : "Get Started"}
        </Button>

        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{" "}
            <Link href="/login" variant="body2" sx={{ fontWeight: "bold", textDecoration: "none" }}>
              Log in
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={null}>
      <RegisterForm />
    </React.Suspense>
  );
}
