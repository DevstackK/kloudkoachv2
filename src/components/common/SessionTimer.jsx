import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuth } from '../../context/AuthContext';

const SessionTimer = ({ startTime, featureCode, onLimitReached, isActive }) => {
  const { usage } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [limitMinutes, setLimitMinutes] = useState(-1);

  useEffect(() => {
    if (usage && usage.features) {
      const feature = usage.features.find(f => f.featureCode === featureCode);
      if (feature) {
        // If limit is -1 (unlimited), keep it -1. Otherwise use remaining.
        setLimitMinutes(feature.limit === -1 ? -1 : feature.remaining);
      }
    }
  }, [usage, featureCode]);

  useEffect(() => {
    let interval = null;

    if (isActive) {
      interval = setInterval(() => {
        const now = new Date();
        // Calculate difference in seconds
        const diffInSeconds = Math.floor((now - new Date(startTime)) / 1000);
        setElapsedSeconds(diffInSeconds);

        // Check limit (if not unlimited)
        if (limitMinutes !== -1) {
           const elapsedMinutes = diffInSeconds / 60;
           // Buffer: Stop 5 seconds before the exact limit to ensure backend accepts it
           if (elapsedMinutes >= limitMinutes) {
             onLimitReached();
           }
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, startTime, limitMinutes, onLimitReached]);

  // Format time as MM:SS
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine color (Yellow if close to limit, Red if over)
  const getTimerColor = () => {
    if (limitMinutes === -1) return "success.main";
    
    const elapsedMinutes = elapsedSeconds / 60;
    const remaining = limitMinutes - elapsedMinutes;

    if (remaining <= 1) return "error.main"; // Less than 1 min left
    if (remaining <= 3) return "warning.main"; // Less than 3 mins left
    return "primary.main";
  };

  return (
    <Paper 
      elevation={3}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: '20px',
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        border: '1px solid',
        borderColor: getTimerColor()
      }}
    >
      <AccessTimeIcon sx={{ color: getTimerColor(), fontSize: 20 }} />
      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: getTimerColor(), fontFamily: 'monospace' }}>
        {formatTime(elapsedSeconds)}
      </Typography>
      {limitMinutes !== -1 && (
        <Typography variant="caption" color="text.secondary">
          / {Math.floor(limitMinutes)}m left
        </Typography>
      )}
    </Paper>
  );
};

export default SessionTimer;