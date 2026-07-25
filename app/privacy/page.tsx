"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Container, Paper, Typography, Box, List, ListItem, ListItemIcon, ListItemText, Divider, Button, Alert } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SecurityIcon from "@mui/icons-material/Security";
import MicIcon from "@mui/icons-material/Mic";
import StorageIcon from "@mui/icons-material/Storage";
import ExtensionIcon from "@mui/icons-material/Extension";
import ShareIcon from "@mui/icons-material/Share";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function PrivacyPage() {
  const router = useRouter();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleClose = () => {
    window.close();
    if (!window.closed) {
      router.push("/");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 6 }}>
      <Container maxWidth="md">
        <Button startIcon={<CloseIcon />} onClick={handleClose} sx={{ mb: 3 }} color="inherit">
          Close Tab
        </Button>

        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
          <Box textAlign="center" mb={4}>
            <Typography variant="h4" fontWeight="800" gutterBottom>
              Privacy Policy
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Kloud Koach – Web App &amp; Chrome Extension
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Last Updated: {new Date().toLocaleDateString()}
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <StorageIcon color="primary" /> 1. What We Collect
            </Typography>
            <List dense>
              {[
                "Account details: name, email address, hashed password.",
                "Content you provide: job role/description, resume text, course material you upload.",
                "Session data: interview questions asked, AI-suggested answers, session ratings/feedback.",
                "Billing data: handled by Stripe - we store your plan/subscription status, not your card details.",
              ].map((text) => (
                <ListItem key={text}>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MicIcon color="primary" /> 2. Audio &amp; the Chrome Extension
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The Kloud Koach Chrome extension captures the audio of the meeting tab you explicitly start a session
              on (e.g. a Zoom/Meet/Teams web call), only while a session is actively running.
            </Typography>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              <strong>We do not record or store raw audio.</strong> Captured audio is streamed directly to our
              speech-to-text provider (Deepgram) for live transcription and is not retained by us or by Deepgram
              beyond the transcription request itself.
            </Alert>
            <Typography variant="body2" color="text.secondary" paragraph>
              The resulting text is sent to our backend, which calls Anthropic&apos;s Claude API to generate a
              suggested answer. We store the transcribed question, the suggested answer, and session
              metadata (job role, timing, rating) as your session history - never the raw audio.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Audio capture stops immediately when you click &quot;End Session,&quot; close the side panel, or use
              Chrome&apos;s own &quot;Stop sharing&quot; control.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ShareIcon color="primary" /> 3. Third Parties We Share Data With
            </Typography>
            <List dense>
              {[
                "Anthropic (Claude API) - processes transcribed questions and your resume/job context to generate suggested answers.",
                "Deepgram - processes streamed audio to produce a live text transcript.",
                "Stripe - processes payments and manages subscriptions; we never see or store your card details.",
                "SendGrid - delivers account verification and password-reset emails.",
                "Supabase - hosts our production database (encrypted at rest).",
                "Vercel - hosts our web application and API.",
              ].map((text) => (
                <ListItem key={text}>
                  <ListItemIcon>
                    <ShareIcon color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              We do not sell your data, and we do not share it with any other third party for advertising purposes.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ExtensionIcon color="primary" /> 4. Chrome Extension Permissions
            </Typography>
            <List dense>
              {[
                { p: "tabCapture", d: "captures audio from the meeting tab you start a session on." },
                { p: "sidePanel", d: "displays the live coaching UI alongside your meeting tab." },
                { p: "storage", d: "stores your device pairing token and server URL locally in Chrome, never on our servers in plain form." },
                { p: "offscreen", d: "required by Chrome to process audio outside the visible extension UI." },
                { p: "activeTab / host permissions", d: "lets the extension talk to the Kloud Koach API for the tab you're actively using." },
              ].map(({ p, d }) => (
                <ListItem key={p}>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={<><strong>{p}</strong> - {d}</>} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DeleteIcon color="primary" /> 5. Data Retention &amp; Deletion
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We retain session history and account data for as long as your account is active. You can disconnect
              the Chrome extension at any time from your dashboard, and can request full account and data deletion
              by contacting us.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SecurityIcon color="primary" /> 6. Security
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Passwords are hashed (bcrypt), sessions use httpOnly secure cookies, and all traffic is encrypted in
              transit (HTTPS/WSS). See our{" "}
              <Typography component="a" href="/terms" color="primary" sx={{ textDecoration: "underline" }}>
                Terms of Service
              </Typography>{" "}
              for how the Service itself may be used.
            </Typography>
          </Box>

          <Box sx={{ mt: 4, p: 3, bgcolor: "background.default", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" align="center" color="text.secondary">
              Questions about this policy or your data? Contact us at{" "}
              <Typography component="a" href="mailto:privacy@kloudstack.co.uk" color="primary">
                privacy@kloudstack.co.uk
              </Typography>
              .
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
