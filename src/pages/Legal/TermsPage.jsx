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
            <GavelIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h4" fontWeight="800" gutterBottom>
              Terms of Service & Acceptable Usage
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Guidelines for using Kloud Koach ethically and legally.
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
            <strong>Core Principle:</strong> AI should be used as a coach to prepare you, not a proxy to answer for you. Misuse may result in account termination.
          </Alert>

          {/* 1. General Principle */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              1. General Principle of AI Usage
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Kloud Koach is designed to act as an intelligent co-pilot for interview preparation and skill development. 
              While there is no UK law explicitly banning AI assistance in interviews, the legality and ethics depend entirely on <strong>how</strong> the tool is used.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Users agree to use this tool to enhance their own capabilities, not to deceive potential employers.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 2. Permitted Use */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon /> 2. Permitted Use (Acceptable)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The following uses are considered ethical and legally sound, similar to using a human career coach:
            </Typography>
            <List dense>
              {[
                "Practicing interview questions and receiving feedback.",
                "Structuring STAR (Situation, Task, Action, Result) responses.",
                "Using the tool for note-taking or remembering specific examples from your past experience.",
                "Using digital cues to maintain structure and confidence during preparation."
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* 3. Prohibited Use */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CancelIcon /> 3. Prohibited Conduct (Risky)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The following actions constitute misrepresentation and dishonest conduct. Engaging in these activities may lead to job offer withdrawals or dismissal by employers:
            </Typography>
            <List dense>
              {[
                "Allowing the AI to generate answers that you repeat verbatim without understanding.",
                "Using the AI to answer questions in real-time to create a false impression of your skills.",
                "Using the tool during assessments where 'No external assistance' or 'No third-party tools' is explicitly stated by the employer.",
                "Relying on the AI to act as a hidden proxy during an interview."
              ].map((text, i) => (
                <ListItem key={i}>
                  <ListItemIcon><CancelIcon color="error" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 4. Data Protection */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" /> 4. Data Protection & Recording (UK GDPR)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              If you use features that capture audio or analyze conversations, UK GDPR regulations apply.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Key Compliance Rule:
                </Typography>
                <Typography variant="body2">
                    You must not record, transcribe, or process an interviewer's voice or data without their explicit consent. 
                    Silent note-prompting is generally acceptable, but recording the interviewer without disclosure is strictly prohibited under our terms.
                </Typography>
            </Paper>
          </Box>

          {/* 5. User Responsibility */}
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              5. User Responsibility
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              By using Kloud Koach, you acknowledge that:
            </Typography>
            <Typography variant="body2" component="blockquote" sx={{ borderLeft: 4, borderColor: 'primary.main', pl: 2, fontStyle: 'italic' }}>
              "AI supports preparation and structure, but the human must provide the thinking, judgment, and final answers."
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.disabled' }}>
                Last Updated: {new Date().toLocaleDateString()}
            </Typography>
          </Box>

        </Paper>
      </Container>
    </Box>
  );
};

export default TermsPage;