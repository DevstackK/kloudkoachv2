"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SecurityIcon from "@mui/icons-material/Security";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import WarningIcon from "@mui/icons-material/Warning";
import VerifiedIcon from "@mui/icons-material/Verified";

export default function TermsPage() {
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
              Terms of Service &amp; Acceptable Usage Policy
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Kloud Koach – AI-Coaching as a Service (ACaaS)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Last Updated: {new Date().toLocaleDateString()}
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
            <strong>Important Notice:</strong> By using Kloud Koach, you agree to these Terms and acknowledge your
            responsibility to comply with all applicable laws, employer policies, and professional standards.
          </Alert>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BusinessIcon color="primary" /> 1. About Kloud Koach
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kloud Koach (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides AI-powered coaching, preparation,
              and guidance tools designed to support users in learning, practice, and professional development.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kloud Koach does <strong>not</strong> act as an employer, recruiter, assessor, or certification body.
              Our service is designed for preparation purposes only.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: "success.main", display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleIcon /> 2. Intended Use of the Service
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kloud Koach is intended <strong>solely</strong> for:
            </Typography>
            <List dense>
              {[
                "Interview preparation and practice",
                "Skills development and rehearsal",
                "Personal development and learning",
                "Mock interviews and self-reflection",
                "Resume/CV optimization guidance",
              ].map((text) => (
                <ListItem key={text}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              <strong>Prohibited:</strong> The Service must <strong>not</strong> be used during live, real-world
              interviews, assessments, exams, or evaluations unless explicitly authorized by the interviewing
              organization.
            </Alert>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: "error.main", display: "flex", alignItems: "center", gap: 1 }}>
              <CancelIcon /> 3. Prohibited Use
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You agree <strong>not</strong> to use Kloud Koach:
            </Typography>
            <List dense>
              {[
                "During a live interview, assessment, or evaluation without explicit prior consent from the interviewer or organization",
                "In any way that misrepresents your skills, knowledge, or experience",
                "To deceive, mislead, or gain an unfair advantage over others",
                "In breach of employer, recruiter, academic, or professional body rules",
                "In violation of any applicable laws or regulations",
              ].map((text) => (
                <ListItem key={text}>
                  <ListItemIcon>
                    <CancelIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: "italic" }}>
              Any such prohibited use is <strong>solely</strong> the responsibility of the user.
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              4. User Responsibility &amp; Compliance
            </Typography>
            <List dense>
              {[
                "You are responsible for ensuring your use of Kloud Koach complies with employer or recruiter policies, interview/assessment rules, and professional/ethical standards.",
                "Kloud Koach cannot verify whether AI assistance is permitted in any specific situation.",
                "Any consequences arising from misuse (including rejected applications, disciplinary action, or termination of employment) are your sole responsibility.",
                "You must exercise independent judgment before relying on any AI-generated outputs.",
              ].map((text) => (
                <ListItem key={text}>
                  <ListItemIcon>
                    <WarningIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              5. No Guarantee of Outcomes
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kloud Koach does <strong>not</strong> guarantee job offers, interview success, performance outcomes, or
              the accuracy and acceptance of AI-generated suggestions. All outputs are{" "}
              <strong>guidance only</strong>.
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              6. No Misrepresentation or Agency
            </Typography>
            <Typography variant="body2" component="blockquote" sx={{ borderLeft: 4, borderColor: "primary.main", pl: 2, my: 2, fontStyle: "italic" }}>
              &quot;Nothing in the Service represents you to third parties, speaks on your behalf, or certifies or
              validates your responses.&quot;
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You remain <strong>fully accountable</strong> for anything you say, submit, or present.
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              7. Limitation of Liability
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              To the fullest extent permitted by law, Kloud Koach shall not be liable for loss of employment
              opportunities, reputational damage, disciplinary action, or any indirect or consequential damages. Our
              total liability shall not exceed the fees paid for the Service in the preceding 12 months.
            </Typography>
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence,
              fraud, or fraudulent misrepresentation.
            </Alert>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              8. Suspension &amp; Termination
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We reserve the right to suspend or terminate accounts, or restrict access, if the Service is used for
              prohibited purposes, in violation of these Terms, or in any unlawful manner.
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              9. Intellectual Property
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All content, models, prompts, and outputs are owned or licensed by Kloud Koach. You may not resell,
              repackage, reverse engineer, or use the Service to build a competing product.
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SecurityIcon color="primary" /> 10. Privacy &amp; Data Protection
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Use of the Service is subject to our{" "}
              <Typography component="a" href="/privacy" color="primary" sx={{ textDecoration: "underline" }}>
                Privacy Policy
              </Typography>
              . You must not record, transcribe, or process an interviewer&apos;s voice or data without their
              explicit consent.
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              11. Governing Law
            </Typography>
            <Typography variant="body2" color="text.secondary">
              These Terms are governed by and interpreted in accordance with the laws of England and Wales.
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              12. Changes to These Terms
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We may update these Terms from time to time. Continued use of the Service constitutes acceptance of
              the updated Terms.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <VerifiedIcon color="success" /> Legal Compliance Notes
            </Typography>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" component="div">
                <strong>Compliance Summary:</strong> Consumer Rights Act 2015, UCTA 1977, and UK GDPR / Data
                Protection Act 2018 considerations are reflected above; liability for death/personal injury due to
                negligence is not excluded.
              </Typography>
            </Alert>
          </Box>

          <Box sx={{ mt: 4, p: 3, bgcolor: "background.default", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" align="center" color="text.secondary">
              By using Kloud Koach, you acknowledge that you have read, understood, and agree to be bound by these
              Terms of Service.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
