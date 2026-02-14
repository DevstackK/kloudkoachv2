import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
// import DeleteIcon from '@mui/icons-material/Delete'; // Keep commented as per your code
import './InterviewPrepTranscription.css';

const InterviewPrepTranscription = ({ chatHistory, question, answers, handleClearHistory }) => {
  const endOfMessagesRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, question, answers]);

  // Hide welcome message once conversation starts
  useEffect(() => {
    if (chatHistory.length > 0 || question || answers) {
      setShowWelcome(false);
    }
  }, [chatHistory, question, answers]);

  // Show welcome message when component is first created
  useEffect(() => {
    setShowWelcome(true);
  }, []);

  // --- FIX: Common styles for text wrapping ---
  const commonBubbleStyles = {
    p: 2,
    maxWidth: '85%',
    wordBreak: 'break-word',    // Forces text to break at width limit
    overflowWrap: 'break-word', // Ensures long words wrap
    '& p': { margin: 0 },       // Resets markdown paragraph margins
    '& pre': { whiteSpace: 'pre-wrap', overflowX: 'auto' } // Handles code blocks
  };

  return (
    <Box
      className="transcription-container"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box className="transcription-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 1 }}>
        <Typography variant="h6">Interview Transcript</Typography>
        {/* <Button ... (Kept commented as provided) ... /> */}
      </Box>

      <Divider />

      <List
        className="transcription-list"
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          position: 'relative'
        }}
      >
        {/* Welcome Message */}
        {showWelcome && chatHistory.length === 0 && !question && !answers && (
          <ListItem>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: 2 }}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  maxWidth: '90%',
                  textAlign: 'center',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                  color: 'primary.contrastText',
                  border: 2,
                  borderColor: 'primary.main',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  🎤 Ready to Start Your Interview!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  To begin your mock interview, please initiate the conversation by saying something like:
                </Typography>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2, mb: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                    border: 1, borderColor: 'divider', borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    "Hello!" or "I'm ready to start the interview"
                  </Typography>
                </Paper>
                <Typography variant="caption">
                  The AI interviewer is waiting for you to speak first. Once you start talking, this message will disappear.
                </Typography>
              </Paper>
            </Box>
          </ListItem>
        )}

        {/* Chat History */}
        {chatHistory.map((entry, index) => (
          <React.Fragment key={index}>
            {/* User Message */}
            <ListItem sx={{ px: 0 }}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                <Paper
                  elevation={0}
                  sx={{
                    ...commonBubbleStyles,
                    background: 'linear-gradient(135deg, #c2185b 0%, #ff4081 100%)',
                    color: 'white',
                    borderRadius: '20px 20px 0 20px',
                    boxShadow: '0 2px 8px rgba(194, 24, 91, 0.2)'
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', mb: 0.5, display: 'block' }}>You</Typography>
                  <ReactMarkdown>{entry.question}</ReactMarkdown>
                </Paper>
              </Box>
            </ListItem>

            {/* AI Message */}
            <ListItem sx={{ px: 0 }}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                <Paper
                  elevation={0}
                  sx={{
                    ...commonBubbleStyles,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'primary.light',
                    color: 'text.primary',
                    borderRadius: '20px 20px 20px 0',
                  }}
                >
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', mb: 0.5, display: 'block' }}>
                    AI Interviewer
                  </Typography>
                  <ReactMarkdown>{entry.answer}</ReactMarkdown>
                </Paper>
              </Box>
            </ListItem>
          </React.Fragment>
        ))}

        {/* Current Question in Progress */}
        {question && (
          <ListItem sx={{ px: 0 }}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <Paper
                elevation={0}
                sx={{
                  ...commonBubbleStyles,
                  background: 'linear-gradient(135deg, #c2185b 0%, #ff4081 100%)',
                  color: 'white',
                  borderRadius: '20px 20px 0 20px',
                  boxShadow: '0 2px 8px rgba(194, 24, 91, 0.2)',
                  opacity: 0.8
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', mb: 0.5, display: 'block' }}>
                  You (Speaking...)
                </Typography>
                <ReactMarkdown>{question}</ReactMarkdown>
              </Paper>
            </Box>
          </ListItem>
        )}

        {/* Current Answer in Progress */}
        {answers && (
          <ListItem sx={{ px: 0 }}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
              <Paper
                elevation={0}
                sx={{
                  ...commonBubbleStyles,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'primary.light',
                  color: 'text.primary',
                  borderRadius: '20px 20px 20px 0',
                  opacity: 0.8
                }}
              >
                <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', mb: 0.5, display: 'block' }}>
                  AI Interviewer (Thinking...)
                </Typography>
                <ReactMarkdown>{answers}</ReactMarkdown>
              </Paper>
            </Box>
          </ListItem>
        )}

        <div ref={endOfMessagesRef} />
      </List>
    </Box>
  );
};

export default InterviewPrepTranscription;