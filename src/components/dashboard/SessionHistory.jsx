import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Button
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { analyticsService } from '../../services/api';

const SessionHistory = ({ isWidget = false }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const Wrapper = isWidget ? Box : Container;
  const wrapperProps = isWidget ? { sx: { mt: 0 } } : { maxWidth: "md", sx: { py: 4 } };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await analyticsService.getSessionHistory();
      if (response.data.success) {
        setSessions(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load session history.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (!score) return 'default';
    if (score >= 8) return 'success';
    if (score >= 5) return 'warning';
    return 'error';
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

  return (
    <Wrapper {...wrapperProps}>
      {!isWidget && (
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="800">
          Interview History
        </Typography>
        <Button 
            variant="contained" 
            startIcon={<PlayCircleOutlineIcon />}
            onClick={() => navigate('/dashboard/interview-preparation')}
        >
            New Session
        </Button>
      </Box>
      )}

      {isWidget && (
         <Typography variant="h6" fontWeight="bold" gutterBottom>
            Recent Activity
         </Typography>
       )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {sessions.length === 0 && !error && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
                No sessions found.
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Start your first AI mock interview to see your progress here.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/dashboard/interview-preparation')}>
                Start Practice
            </Button>
        </Paper>
      )}

      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', width: '100%' }}>
        <List sx={{ p: 0 }}>
          {sessions.map((session, index) => (
            <React.Fragment key={session.userSessionId}>
              {index > 0 && <Divider component="li" />}
              <ListItem 
                button 
                alignItems="flex-start"
                onClick={() => navigate(`/dashboard/analytics/${session.userSessionId}`,
                  { state: { from: isWidget ? '/dashboard/profile' : '/dashboard/history' } }
                )}
                sx={{ 
                    py: 2, 
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: 'action.hover' } 
                }}
              >
                <ListItemIcon sx={{ mt: 0.5 }}>
                  <Box 
                    sx={{ 
                        width: 40, height: 40, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.light', 
                        color: 'primary.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <AssessmentIcon />
                  </Box>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {new Date(session.createdDate).toLocaleDateString(undefined, { 
                                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' 
                            })}
                        </Typography>
                        {session.averageScore ? (
                            <Chip 
                                label={`Score: ${session.averageScore}/10`} 
                                size="small" 
                                color={getScoreColor(session.averageScore)}
                                sx={{ fontWeight: 'bold', height: 24 }}
                            />
                        ) : (
                            <Chip label="Incomplete" size="small" variant="outlined" />
                        )}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" gap={3} mt={0.5}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <AccessTimeIcon fontSize="small" sx={{ fontSize: 16 }} />
                            <Typography variant="body2">{new Date(session.createdDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <PlayCircleOutlineIcon fontSize="small" sx={{ fontSize: 16 }} />
                            <Typography variant="body2">{session.durationMinutes} min session</Typography>
                        </Box>
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => navigate(`/dashboard/analytics/${session.userSessionId}`)}>
                    <ChevronRightIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Wrapper>
  );
};

export default SessionHistory;