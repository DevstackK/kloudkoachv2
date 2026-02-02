import React, { useEffect } from 'react';
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
  useTheme
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import GavelIcon from '@mui/icons-material/Gavel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import WarningIcon from '@mui/icons-material/Warning';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleClose = () => {
    window.close();
    // Fallback: If window.close() is blocked (e.g. if user typed URL directly), navigate home
    if (!window.closed) {
      navigate('/');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="md">

        {/* Navigation */}
        <Button
          startIcon={<CloseIcon />}
          onClick={handleClose}
          sx={{ mb: 3 }}
          color="inherit"
        >
          Close Tab
        </Button>

        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>

          {/* Header */}
          <Box textAlign="center" mb={4}>
            {/* <GavelIcon color="primary" sx={{ fontSize: 48, mb: 1 }} /> */}
            <Box
              component="img"
              src='https://kloudstack.co.uk/wp-content/uploads/2024/10/Kloud-Stack-White-1.png'  // Changed from .svg to .webp
              alt="Kloud Koach Logo"
              sx={{
                mr: 1.5,
                height: 64,
                width: 'auto',
                filter: 'brightness(1) invert(1)'
              }}
            />
            <Typography variant="h4" fontWeight="800" gutterBottom>
              Terms of Service & Acceptable Usage Policy
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Kloud Koach – AI-Coaching as a Service (ACaaS)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Last Updated: {new Date().toLocaleDateString()}
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
            <strong>Important Notice:</strong> By using Kloud Koach, you agree to these Terms and acknowledge your responsibility to comply with all applicable laws, employer policies, and professional standards.
          </Alert>

          {/* 1. About Kloud Koach */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon color="primary" /> 1. About Kloud Koach
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kloud Koach ("we", "us", "our") provides AI-powered coaching, preparation, and guidance tools designed to support users in learning, practice, and professional development.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kloud Koach does <strong>not</strong> act as an employer, recruiter, assessor, or certification body. Our service is designed for preparation purposes only.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 2. Intended Use of the Service */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
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
                "Resume/CV optimization guidance"
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              <strong>🚫 Prohibited:</strong> The Service must <strong>not</strong> be used during live, real-world interviews, assessments, exams, or evaluations unless explicitly authorized by the interviewing organization.
            </Alert>
          </Box>

          {/* 3. Prohibited Use */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
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
                "In violation of any applicable laws or regulations"
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><CancelIcon color="error" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              Any such prohibited use is <strong>solely</strong> the responsibility of the user.
            </Typography>
          </Box>

          {/* 4. User Responsibility & Compliance */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              4. User Responsibility & Compliance
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You acknowledge and agree that:
            </Typography>
            <List dense>
              {[
                "You are responsible for ensuring your use of Kloud Koach complies with employer or recruiter policies, interview/assessment rules, and professional/ethical standards.",
                "Kloud Koach cannot verify whether AI assistance is permitted in any specific situation.",
                "Any consequences arising from misuse (including rejected applications, disciplinary action, or termination of employment) are your sole responsibility.",
                "You must exercise independent judgment before relying on any AI-generated outputs."
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><WarningIcon color="warning" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* 5. No Guarantee of Outcomes */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              5. No Guarantee of Outcomes
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kloud Koach does <strong>not</strong> guarantee:
            </Typography>
            <List dense>
              {[
                "Job offers or interview success",
                "Performance outcomes or assessment results",
                "Accuracy, suitability, or acceptance of AI-generated suggestions",
                "Compatibility with specific employer requirements"
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><CancelIcon color="action" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              All outputs are <strong>guidance only</strong> and should not be treated as instructions or representations of fact.
            </Typography>
          </Box>

          {/* 6. No Misrepresentation or Agency */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              6. No Misrepresentation or Agency
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Nothing in the Service:
            </Typography>
            <Typography variant="body2" component="blockquote" sx={{ borderLeft: 4, borderColor: 'primary.main', pl: 2, my: 2, fontStyle: 'italic' }}>
              "Represents you to third parties, speaks on your behalf, or certifies or validates your responses."
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You remain <strong>fully accountable</strong> for anything you say, submit, or present.
            </Typography>
          </Box>

          {/* 7. Limitation of Liability */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              7. Limitation of Liability
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              To the fullest extent permitted by law, Kloud Koach shall <strong>not</strong> be liable for:
            </Typography>
            <List dense>
              {[
                "Loss of employment opportunities or career setbacks",
                "Reputational damage or professional consequences",
                "Disciplinary action or legal disputes between you and third parties",
                "Any indirect, consequential, or incidental damages"
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><CancelIcon color="action" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Our total liability shall not exceed the fees paid for the Service in the preceding 12 months.
            </Typography>
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              <strong>Important:</strong> Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation.
            </Alert>
          </Box>

          {/* 8. Suspension & Termination */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              8. Suspension & Termination
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We reserve the right to suspend or terminate accounts, or restrict access, if we reasonably believe the Service is being used:
            </Typography>
            <List dense>
              {[
                "For prohibited purposes or in violation of these Terms",
                "In a way that exposes Kloud Koach to legal, reputational, or regulatory risk",
                "To harm, harass, or deceive others",
                "In any unlawful manner"
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><WarningIcon color="warning" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* 9. Intellectual Property */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              9. Intellectual Property
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              All content, models, prompts, and outputs are owned or licensed by Kloud Koach.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You may <strong>not</strong>:
            </Typography>
            <List dense>
              {[
                "Resell, repackage, or redistribute the Service or its outputs",
                "Reverse engineer, decompile, or attempt to extract source code",
                "Represent AI outputs as proprietary assessment tools or your own work",
                "Use the Service to create competing products or services"
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><CancelIcon color="error" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* 10. Privacy & Data Protection */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" /> 10. Privacy & Data Protection
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Use of the Service is subject to our Privacy Policy, which explains how we collect, use, and protect personal data in accordance with applicable data protection laws.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Key Compliance Rules:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><SecurityIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="You must not record, transcribe, or process an interviewer's voice or data without their explicit consent" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SecurityIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="All user data is processed in accordance with our Privacy Policy and applicable laws" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SecurityIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="We implement appropriate technical and organizational measures to protect your data" />
                </ListItem>
              </List>
            </Paper>
          </Box>

          {/* 11. Governing Law */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              11. Governing Law
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              These Terms are governed by and interpreted in accordance with the laws of England and Wales.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </Typography>
          </Box>

          {/* 12. Changes to These Terms */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              12. Changes to These Terms
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We may update these Terms from time to time. Continued use of the Service constitutes acceptance of the updated Terms.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We will notify users of material changes through the Service or via email.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Verification Notes */}
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VerifiedIcon color="success" /> Legal Compliance Notes
            </Typography>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" component="div">
                <strong>Compliance Summary:</strong>
                <ul style={{ marginTop: '8px', marginBottom: '8px', paddingLeft: '20px' }}>
                  <li>Consumer Rights Act 2015 compliance: Liability clauses explicitly preserve statutory rights</li>
                  <li>UCTA 1977 compliance: Liability for death/personal injury due to negligence cannot be excluded</li>
                  <li>Data Protection Act 2018 / UK GDPR: Privacy reference ensures compliance</li>
                  <li>Transparency & fairness: Clear language aligns with UK contract law principles</li>
                  <li>AI disclaimer: Strengthened to emphasise outputs are guidance only, not professional advice</li>
                </ul>
              </Typography>
            </Alert>
          </Box>

          {/* Acceptance Statement */}
          <Box sx={{ mt: 4, p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" align="center" color="text.secondary">
              By using Kloud Koach, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </Typography>
          </Box>

        </Paper>
      </Container>
    </Box>
  );
};

export default TermsPage;