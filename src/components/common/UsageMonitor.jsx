import React from 'react';
import { Paper, Typography, Box, LinearProgress } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DescriptionIcon from '@mui/icons-material/Description';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Icon for Builder

const UsageMonitor = () => {
  const { usage, user } = useAuth();

  if (!usage || !usage.features) return null;

  // Filter for relevant features to display
  const liveInterview = usage.features.find(f => f.featureCode === 'LIVE_INTERVIEW');
  const interviewPrep = usage.features.find(f => f.featureCode === 'INTERVIEW_PREP');
  const resumes = usage.features.find(f => f.featureCode === 'RESUME_UPLOAD');
  // NEW: Get Builder Usage
  const resumeBuilder = usage.features.find(f => f.featureCode === 'RESUME_BUILDER');

  const getProgressColor = (remaining, limit) => {
    if (limit === -1) return "success"; // Unlimited
    const percentage = (remaining / limit) * 100;
    if (percentage < 20) return "error";
    if (percentage < 50) return "warning";
    return "primary";
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 3,
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(45deg, #1a237e 30%, #311b92 90%)'
          : 'linear-gradient(45deg, #e3f2fd 30%, #f3e5f5 90%)',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
          {user?.planName || usage.planName} Plan Usage
        </Typography>
      </Box>

      {/* Live Interview Usage */}
      {liveInterview && (
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <AccessTimeIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight="medium">Live Interview Co-Pilot</Typography>
            </Box>
            <Typography variant="caption" fontWeight="bold">
              {liveInterview.limit === -1
                ? "Unlimited"
                : `${Math.round(liveInterview.remaining)} / ${liveInterview.limit} mins`}
            </Typography>
          </Box>
          {liveInterview.limit !== -1 && (
            <LinearProgress
              variant="determinate"
              value={(liveInterview.remaining / liveInterview.limit) * 100}
              color={getProgressColor(liveInterview.remaining, liveInterview.limit)}
              sx={{ borderRadius: 2, height: 6 }}
            />
          )}
        </Box>
      )}

      {/* Interview Prep Usage */}
      {interviewPrep && (
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <ModelTrainingIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight="medium">Interview Prep</Typography>
            </Box>
            <Typography variant="caption" fontWeight="bold">
              {interviewPrep.limit === -1
                ? "Unlimited"
                : `${Math.round(interviewPrep.remaining)} / ${interviewPrep.limit} mins`}
            </Typography>
          </Box>
          {interviewPrep.limit !== -1 && (
            <LinearProgress
              variant="determinate"
              value={(interviewPrep.remaining / interviewPrep.limit) * 100}
              color={getProgressColor(interviewPrep.remaining, interviewPrep.limit)}
              sx={{ borderRadius: 2, height: 6 }}
            />
          )}
        </Box>
      )}

      {/* NEW: Resume Builder Usage */}
      {resumeBuilder && resumeBuilder.limit >= 1 && (
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <AutoFixHighIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight="medium">AI Resume Builder</Typography>
            </Box>
            <Typography variant="caption" fontWeight="bold">
              {resumeBuilder.limit === -1
                ? "Unlimited"
                : `${resumeBuilder.remaining} / ${resumeBuilder.limit} builds`}
            </Typography>
          </Box>
          {resumeBuilder.limit !== -1 && (
            <LinearProgress
              variant="determinate"
              value={(resumeBuilder.remaining / resumeBuilder.limit) * 100}
              color={getProgressColor(resumeBuilder.remaining, resumeBuilder.limit)}
              sx={{ borderRadius: 2, height: 6 }}
            />
          )}
        </Box>
      )}

      {/* Resume Upload Usage */}
      {resumes && resumes.limit >= 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <DescriptionIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight="medium">PDF Uploads</Typography>
            </Box>
            <Typography variant="caption" fontWeight="bold">
              {resumes.limit === -1
                ? "Unlimited"
                : `${resumes.remaining} / ${resumes.limit} left`}
            </Typography>
          </Box>
          {resumes.limit !== -1 && (
            <LinearProgress
              variant="determinate"
              value={(resumes.remaining / resumes.limit) * 100}
              color={getProgressColor(resumes.remaining, resumes.limit)}
              sx={{ borderRadius: 2, height: 6 }}
            />
          )}
        </Box>
      )}
    </Paper>
  );
};

export default UsageMonitor;