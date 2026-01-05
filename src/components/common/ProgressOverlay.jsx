import React from 'react';
import {
  Backdrop,
  Box,
  CircularProgress,
  Typography,
  Paper,
  Portal // Import Portal to break out of the parent container
} from '@mui/material';

const ProgressOverlay = ({ open, title, message, progress }) => {
  // If not open, don't render anything to avoid Z-index issues
  if (!open) return null;

  return (
    <Portal>
      <Backdrop
        sx={{
          color: '#fff',
          // Critical: High Z-Index to sit on top of everything (Header, Sidebar)
          zIndex: 9999, 
          // Darker background for better focus
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          backdropFilter: 'blur(4px)',
          // Ensure it catches all pointer events
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh'
        }}
        open={open}
        // Prevent clicking through
        onClick={(e) => e.stopPropagation()} 
      >
        <Paper
          elevation={24}
          sx={{
            p: 4,
            maxWidth: 400,
            width: '90%',
            textAlign: 'center',
            backgroundColor: 'background.paper',
            color: 'text.primary',
            borderRadius: 3
          }}
        >
          <CircularProgress 
            size={60} 
            thickness={4} 
            sx={{ mb: 2, color: 'primary.main' }} 
          />
          
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, whiteSpace: 'pre-line' }}>
            {title || 'Processing...'}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {message || 'Please wait while we process your request'}
          </Typography>
          
          {progress !== undefined && (
            <Box sx={{ mt: 2, width: '100%' }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                {progress}%
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: 8,
                  backgroundColor: 'grey.300',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}
              >
                <Box
                  sx={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: 'primary.main',
                    transition: 'width 0.3s ease-in-out'
                  }}
                />
              </Box>
            </Box>
          )}
        </Paper>
      </Backdrop>
    </Portal>
  );
};

export default ProgressOverlay;