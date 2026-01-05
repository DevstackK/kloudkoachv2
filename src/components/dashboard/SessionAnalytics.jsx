import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Stack,
  useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { analyticsService } from '../../services/api';

const SessionAnalytics = () => {
  const { sessionId } = useParams(); // Get ID from URL
  const navigate = useNavigate();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState([]);
  const [error, setError] = useState('');
  const location = useLocation();
  const backPath = location.state?.from || '/dashboard/history';
  const backLabel = backPath.includes('profile') ? 'Back to Profile' : 'Back to History';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await analyticsService.getSessionAnalytics(sessionId);
        if (response.data.success) {
          setInteractions(response.data.data);
        } else {
          setError('Could not retrieve session data.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) fetchAnalytics();
  }, [sessionId]);

  // UI Helpers
  const getRatingColor = (rating) => {
    if (rating >= 8) return 'success';
    if (rating >= 5) return 'warning';
    return 'error';
  };

  const calculateAverageScore = () => {
    if (!interactions.length) return 0;
    const total = interactions.reduce((acc, curr) => acc + curr.rating, 0);
    return (total / interactions.length).toFixed(1);
  };

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(backPath)}
        sx={{ mb: 3 }}
      >
        {backLabel}
      </Button>

      {/* 1. SCORECARD HEADER */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
            : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="800" gutterBottom>
            Session Report
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {interactions.length} Questions Analyzed
          </Typography>
        </Box>
        
        <Box textAlign="center">
          <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold">
            AVERAGE SCORE
          </Typography>
          <Typography 
            variant="h2" 
            fontWeight="900" 
            sx={{ color: theme.palette.primary.main }}
          >
            {calculateAverageScore()}
            <Typography component="span" variant="h5" color="text.secondary">/10</Typography>
          </Typography>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {!loading && interactions.length === 0 && (
        <Alert severity="info">No interaction data found for this session.</Alert>
      )}

      {/* 2. INTERACTIONS LIST */}
      <Stack spacing={3}>
        {interactions.map((item, index) => (
          <Paper 
            key={item.interactionId || index} 
            elevation={3} 
            sx={{ 
              overflow: 'hidden', 
              borderRadius: 2,
              borderLeft: '6px solid',
              borderColor: `${getRatingColor(item.rating)}.main`
            }}
          >
            <Box p={3}>
              {/* Question & Rating */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} mb={2}>
                <Typography variant="h6" fontWeight="600" sx={{ flexGrow: 1 }}>
                  {index + 1}. {item.questionText}
                </Typography>
                <Chip 
                  label={`${item.rating}/10`} 
                  color={getRatingColor(item.rating)} 
                  sx={{ fontWeight: 'bold', borderRadius: 1 }} 
                />
              </Box>

              {/* Your Answer */}
              <Box mb={2} p={2} bgcolor="action.hover" borderRadius={2}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary" gutterBottom display="block">
                  YOUR ANSWER
                </Typography>
                <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  "{item.userAnswerText}"
                </Typography>
              </Box>

              {/* AI Feedback */}
              <Box display="flex" gap={1.5} alignItems="flex-start" mb={2}>
                {item.rating >= 7 ? <CheckCircleIcon color="success" sx={{ mt: 0.5 }} /> : <WarningIcon color="warning" sx={{ mt: 0.5 }} />}
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    KloudKoach Feedback
                  </Typography>
                  <Typography variant="body2">
                    {item.feedback}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Optimal Answer (Hidden by default) */}
              <Accordion elevation={0} disableGutters sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { m: 0 } }}
                >
                  <Box display="flex" alignItems="center" gap={1} color="primary.main">
                    <LightbulbIcon fontSize="small" />
                    <Typography variant="button" fontWeight="bold">
                      View Optimal Answer
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pb: 0, pt: 1 }}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', borderStyle: 'dashed' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                        {item.suggestedAnswer}
                    </Typography>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
};

export default SessionAnalytics;