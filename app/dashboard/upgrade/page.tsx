"use client";

import * as React from "react";
import { Container, Grid, Paper, Typography, Button, Box, Chip, List, ListItem, ListItemIcon, ListItemText, Alert, CircularProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

type PlanFeature = {
  displayName: string;
  isActive: boolean;
  limitValue: number;
  unit: string;
};

type Plan = {
  subscriptionPlanId: string;
  name: string;
  price: number;
  isPopular: boolean;
  isActive: boolean;
  features: PlanFeature[];
};

type SubscriptionInfo = {
  planId: string;
  planName: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  hasStripeSubscription: boolean;
} | null;

export default function UpgradePlanPage() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [subscription, setSubscription] = React.useState<SubscriptionInfo>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch("/api/plans"),
        fetch("/api/billing/subscription", { credentials: "include" }),
      ]);
      const plansJson = await plansRes.json();
      const subJson = await subRes.json();
      if (plansJson.success) setPlans(plansJson.data);
      if (subJson.success) setSubscription(subJson.data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSelectPlan = async (plan: Plan) => {
    setError("");
    setMessage("");
    setActionLoading(plan.subscriptionPlanId);
    try {
      const hasExistingPaidSub = subscription?.hasStripeSubscription;
      const endpoint = hasExistingPaidSub ? "/api/billing/change-plan" : "/api/billing/create-checkout-session";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId: plan.subscriptionPlanId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not change plan.");
      }
      if (json.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      setMessage(`Switched to ${plan.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change plan.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setError("");
    setActionLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not open billing portal.");
      window.location.href = json.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal.");
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setError("");
    setActionLoading("cancel");
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not cancel subscription.");
      setMessage("Your subscription will end at the current billing period.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel subscription.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setError("");
    setActionLoading("reactivate");
    try {
      const res = await fetch("/api/billing/reactivate", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not reactivate subscription.");
      setMessage("Subscription reactivated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reactivate subscription.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 10, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6, flex: 1 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Manage Your Plan
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        {subscription ? `Current plan: ${subscription.planName}` : "You're currently on the Free plan."}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 600, mx: "auto" }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 3, maxWidth: 600, mx: "auto" }} onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}

      {subscription?.hasStripeSubscription && (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 4 }}>
          <Button variant="outlined" onClick={handleManageBilling} disabled={actionLoading === "portal"}>
            {actionLoading === "portal" ? <CircularProgress size={20} /> : "Manage Billing"}
          </Button>
          {subscription.cancelAtPeriodEnd ? (
            <Button variant="outlined" color="success" onClick={handleReactivate} disabled={actionLoading === "reactivate"}>
              {actionLoading === "reactivate" ? <CircularProgress size={20} /> : "Reactivate"}
            </Button>
          ) : (
            <Button variant="outlined" color="error" onClick={handleCancel} disabled={actionLoading === "cancel"}>
              {actionLoading === "cancel" ? <CircularProgress size={20} /> : "Cancel Subscription"}
            </Button>
          )}
        </Box>
      )}

      <Grid container spacing={4} justifyContent="center" alignItems="stretch">
        {plans.map((plan) => {
          const isCurrent = subscription?.planId === plan.subscriptionPlanId || (!subscription && plan.price === 0);
          return (
            <Grid item xs={12} sm={6} md={4} key={plan.subscriptionPlanId}>
              <Paper
                sx={{
                  p: 4,
                  borderRadius: "20px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  border: isCurrent ? "2px solid" : "1px solid",
                  borderColor: isCurrent ? "primary.main" : "divider",
                }}
              >
                {isCurrent && (
                  <Chip label="Current Plan" color="primary" size="small" sx={{ position: "absolute", top: 15, right: 15, fontWeight: "bold" }} />
                )}
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="h3" fontWeight="bold" my={2}>
                  ${plan.price}
                  <Typography variant="body1" component="span" color="text.secondary">
                    /mo
                  </Typography>
                </Typography>
                <List sx={{ flexGrow: 1 }}>
                  {plan.features
                    .filter((f) => f.isActive && f.limitValue !== 0)
                    .map((f, i) => (
                      <ListItem key={i} disableGutters>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckCircleIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={f.displayName} secondary={f.limitValue === -1 ? "Unlimited" : `${f.limitValue} ${f.unit}`} />
                      </ListItem>
                    ))}
                </List>
                <Button
                  variant={isCurrent ? "outlined" : "contained"}
                  fullWidth
                  size="large"
                  disabled={isCurrent || actionLoading === plan.subscriptionPlanId}
                  onClick={() => handleSelectPlan(plan)}
                  sx={{ mt: "auto", py: 1.5, borderRadius: "12px" }}
                >
                  {actionLoading === plan.subscriptionPlanId ? <CircularProgress size={20} color="inherit" /> : isCurrent ? "Current Plan" : "Select Plan"}
                </Button>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
}
