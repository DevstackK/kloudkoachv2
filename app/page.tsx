"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  useTheme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import MicIcon from "@mui/icons-material/Mic";
import DescriptionIcon from "@mui/icons-material/Description";
import SchoolIcon from "@mui/icons-material/School";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import styles from "./landing.module.css";
import { useAuth } from "@/lib/AuthProvider";

type PlanFeature = {
  displayName: string;
  isActive: boolean;
  limitValue: number;
  unit: string;
  featureType: "TimeBased" | "CountBased" | "TokenBased";
};

type Plan = {
  subscriptionPlanId: string;
  name: string;
  price: number;
  billingCycle: string;
  description: string;
  priority: number;
  isPopular: boolean;
  isActive: boolean;
  features: PlanFeature[];
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function LandingPage() {
  const router = useRouter();
  const theme = useTheme();
  const { user, loading: authLoading } = useAuth();

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/plans");
        const json = await res.json();
        if (json.success) {
          setPlans(json.data);
        } else {
          setError("Failed to load plans.");
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
        setError("Could not connect to server.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePlanSelect = (plan: Plan) => {
    router.push(`/register?plan=${plan.subscriptionPlanId}`);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ position: "absolute", top: 0, zIndex: 10 }}>
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: "space-between", py: 2 }}>
            <Box
              onClick={() => router.push("/")}
              sx={{ display: "flex", alignItems: "center", color: "white", cursor: "pointer", "&:hover": { opacity: 0.8 } }}
            >
              <SmartToyIcon sx={{ mr: 1, fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">
                Kloud Koach
              </Typography>
            </Box>

            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              <Button onClick={() => scrollToId("features")} sx={{ color: "white", mx: 1 }}>
                Features
              </Button>
              <Button onClick={() => scrollToId("mission")} sx={{ color: "white", mx: 1 }}>
                Our Mission
              </Button>
              <Button onClick={() => scrollToId("plans")} sx={{ color: "white", mx: 1 }}>
                Plans
              </Button>
            </Box>

            <Box>
              <Button
                variant="outlined"
                sx={{ color: "white", px: 3, m: 1, borderColor: "white", mr: 2, "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } }}
                onClick={() => router.push("/login")}
              >
                Login
              </Button>
              <Button
                variant="contained"
                color="secondary"
                sx={{ borderRadius: "25px", px: 3, m: 1, fontWeight: "bold" }}
                onClick={() => scrollToId("plans")}
              >
                Get Started
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box className={styles.hero}>
        <Container maxWidth="md" sx={{ mt: 10 }}>
          <Box className={styles.heroBadge}>
            <Typography variant="caption" fontWeight="bold">
              AI-Powered Success
            </Typography>
          </Box>

          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 800, mb: 3 }}>
            Master Your Interviews,
            <br />
            AI-Coaching as a Service (ACaaS)
          </Typography>

          <Typography variant="h6" sx={{ opacity: 0.9, mb: 5, maxWidth: "800px", mx: "auto", lineHeight: 1.6 }}>
            Kloud Koach brings a personal AI coach to your device instantly, digitally, and securely. We are
            revolutionizing how candidates prepare for their dream jobs with real-time feedback and live assistance.
          </Typography>

          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ px: 5, py: 1.5, fontSize: "1.1rem", boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}
            onClick={() => scrollToId("plans")}
          >
            Start Preparing Now
          </Button>
        </Container>
      </Box>

      <Container id="features" maxWidth="lg" className={styles.section}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ position: "relative" }}>
              <Box
                sx={{
                  width: "60px",
                  height: "60px",
                  bgcolor: "#29b6f6",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 3,
                  boxShadow: "0 4px 12px rgba(41, 182, 246, 0.4)",
                }}
              >
                <SmartToyIcon sx={{ color: "white", fontSize: 32 }} />
              </Box>
              <Typography variant="h3" gutterBottom color="primary" sx={{ fontWeight: 700 }}>
                What is Kloud Koach?
              </Typography>
              <Typography variant="body1" paragraph color="text.secondary" sx={{ fontSize: "1.1rem", mb: 3 }}>
                Kloud Koach is a digital career connectivity solution for job seekers, offering instant preparation
                on compatible devices without the need for expensive coaches.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                It provides fast, reliable feedback for over 100+ job roles, eliminating anxiety and preparation
                issues for freshers, professionals, and digital nomads.
              </Typography>

              <Box sx={{ width: "50px", height: "4px", bgcolor: "#29b6f6", mt: 4, borderRadius: "2px" }} />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ position: "relative", height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box
                className={styles.pulse}
                sx={{
                  width: "180px",
                  height: "180px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #29b6f6 0%, #0288d1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 20px 40px rgba(2, 136, 209, 0.3)",
                  zIndex: 2,
                }}
              >
                <SmartToyIcon sx={{ fontSize: 80, color: "white" }} />
              </Box>

              <Paper
                elevation={4}
                className={styles.float}
                sx={{ position: "absolute", top: "20px", right: "40px", p: 2, borderRadius: "16px", display: "flex", alignItems: "center", gap: 2 }}
              >
                <Box sx={{ p: 1, bgcolor: "#e1f5fe", borderRadius: "8px" }}>
                  <MicIcon color="primary" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Live Co-pilot
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Real-time answers
                  </Typography>
                </Box>
              </Paper>

              <Paper
                elevation={4}
                className={styles.floatDelayed}
                sx={{ position: "absolute", bottom: "40px", left: "20px", p: 2, borderRadius: "16px", display: "flex", alignItems: "center", gap: 2 }}
              >
                <Box sx={{ p: 1, bgcolor: "#fce4ec", borderRadius: "8px" }}>
                  <DescriptionIcon color="secondary" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    CV Analysis
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Data extraction
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ bgcolor: "#f8f9fa", py: 10 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {[
              { icon: <MicIcon sx={{ fontSize: 40 }} />, title: "Live Interview Co-Pilot", desc: "Get real-time assistance during online interviews. The AI listens and suggests answers instantly." },
              { icon: <SchoolIcon sx={{ fontSize: 40 }} />, title: "Mock Interview Prep", desc: "Practice with a patient AI tutor that simulates real interview rounds and gives feedback." },
              { icon: <DescriptionIcon sx={{ fontSize: 40 }} />, title: "Resume Parser", desc: "Upload your CV and let our AI extract structured data to tailor your interview experience." },
            ].map((feature) => (
              <Grid item xs={12} md={4} key={feature.title}>
                <Paper
                  elevation={0}
                  sx={{ p: 4, textAlign: "center", height: "100%", bgcolor: "white", borderRadius: "20px", transition: "transform 0.3s", "&:hover": { transform: "translateY(-10px)", boxShadow: 6 } }}
                >
                  <div className={styles.featureIconWrapper}>{feature.icon}</div>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {feature.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="plans" sx={{ bgcolor: theme.palette.background.default, py: 10 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 700, mb: 6 }}>
            Choose Your Plan
          </Typography>

          {loading && (
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mx: "auto", maxWidth: 600 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && (
            <Grid container spacing={4} justifyContent="center" alignItems="stretch">
              {plans
                .filter((plan) => plan.isActive)
                .map((plan) => {
                  const isFree = plan.price === 0;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={plan.subscriptionPlanId}>
                      <Paper
                        className={styles.planCard}
                        sx={{
                          p: 4,
                          borderRadius: "20px",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          position: "relative",
                          border: plan.isPopular ? "2px solid" : "1px solid",
                          borderColor: plan.isPopular ? "secondary.main" : "divider",
                          bgcolor: "background.paper",
                        }}
                      >
                        {plan.isPopular && (
                          <Box sx={{ position: "absolute", top: 15, right: 15, bgcolor: "secondary.main", color: "white", px: 1.5, py: 0.5, borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold" }}>
                            Popular
                          </Box>
                        )}

                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          {plan.name}
                        </Typography>

                        <Typography variant="h3" fontWeight="bold" my={2}>
                          ${plan.price}
                          <Typography variant="body1" component="span" color="text.secondary">
                            /{plan.billingCycle === "monthly" ? "mo" : "yr"}
                          </Typography>
                        </Typography>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {plan.description}
                        </Typography>

                        <List sx={{ flexGrow: 1, py: 2 }}>
                          {plan.features
                            .filter((feature) => feature.isActive && feature.limitValue !== 0)
                            .map((feature, i) => (
                              <ListItem key={i} disableGutters>
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                  <CheckCircleIcon color={plan.isPopular ? "secondary" : "primary"} fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={feature.displayName}
                                  secondary={feature.limitValue === -1 ? "Unlimited" : `${feature.limitValue} ${feature.unit}`}
                                />
                              </ListItem>
                            ))}
                        </List>

                        <Button
                          variant={plan.isPopular ? "contained" : "outlined"}
                          color={plan.isPopular ? "secondary" : "primary"}
                          fullWidth
                          size="large"
                          sx={{ mt: "auto", py: 1.5, borderRadius: "12px" }}
                          onClick={() => handlePlanSelect(plan)}
                        >
                          {isFree ? "Get Started Free" : "Select Plan"}
                        </Button>
                      </Paper>
                    </Grid>
                  );
                })}
            </Grid>
          )}
        </Container>
      </Box>

      <Container id="mission" maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <Box
          sx={{
            width: "60px",
            height: "60px",
            bgcolor: "#c2185b",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "white",
          }}
        >
          <SchoolIcon />
        </Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          Our Mission
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, mb: 4 }}>
          To democratize career preparation by making high-quality, AI-driven coaching accessible to everyone,
          everywhere.
        </Typography>
      </Container>

      <Box sx={{ bgcolor: "#1a1a1a", color: "white", py: 6, mt: "auto" }}>
        <Container maxWidth="lg" sx={{ textAlign: "center" }}>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            <a href="https://kloudstack.com" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none", fontWeight: "bold" }}>
              © {new Date().getFullYear()} KloudStack Kloud Koach. All rights reserved.
            </a>
          </Typography>

          <Typography variant="caption" sx={{ display: "block", px: 1, mt: 1 }}>
            By using this product, you agree to our{" "}
            <span
              style={{ color: "#64b5f6", cursor: "pointer", textDecoration: "underline", fontWeight: "bold" }}
              onClick={() => window.open("/terms", "_blank")}
            >
              Terms of Service &amp; Acceptable Usage Policy
            </span>
            .
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
