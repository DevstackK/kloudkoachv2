import React, { useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
  Divider,
  Button,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import DeleteIcon from '@mui/icons-material/Delete';
import './LiveInterviewTranscription.css';

const LiveInterviewTranscription = ({ chatHistory, question, answers, handleClearHistory, isFullscreen }) => {
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, question, answers]);

  const textColor = isFullscreen ? '#fff' : 'text.primary';

  return (
    <Box
      className="transcription-container"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: textColor, // Apply text color
        // Remove fixed height from CSS, let parent Paper control it
      }}
    >
      <Box className="transcription-header" sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2, pb: 1,
          // 3. Conditional border
          borderBottom: isFullscreen ? '1px solid rgba(255,255,255,0.2)' : '1px solid #ddd',
        }}>
        <Typography variant="h6">Interview Transcript</Typography>
        <Button
          variant="outlined"
          color={isFullscreen ? "secondary" : "error"} // Use secondary color in FS
          startIcon={<DeleteIcon />}
          onClick={handleClearHistory}
          disabled={chatHistory.length === 0}
        >
          Clear Chat
        </Button>
      </Box>

      <Divider sx={{ borderColor: isFullscreen ? 'rgba(255,255,255,0.2)' : 'divider' }} />

      <List
        className="transcription-list"
        sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}
      >
        {chatHistory.map((entry, index) => (
          <React.Fragment key={index}>
            <ListItem>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                <Paper
                  elevation={0} // No elevation for bubbles
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    // 4. Conditional background
                    bgcolor: isFullscreen ? 'rgba(0,0,0,0.35)' : (theme) =>
                      theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                    color: isFullscreen ? '#fff' : 'text.primary',
                    boxShadow: 'none',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="caption" color={isFullscreen ? "inherit" : "text.secondary"}>
                    Interviewer
                  </Typography>
                  <ReactMarkdown>{entry.question}</ReactMarkdown>
                </Paper>
              </Box>
            </ListItem>

            <ListItem>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                <Paper
                  elevation={0} // No elevation
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    // 4. Conditional background
                    bgcolor: isFullscreen ? 'rgba(152, 170, 255, 0.7)' : 'primary.main', // Semi-transparent purple
                    color: isFullscreen ? '#fff' : 'primary.contrastText',
                    boxShadow: 'none',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="caption">Your Answer (AI)</Typography>
                  <ReactMarkdown>{entry.answer}</ReactMarkdown>
                </Paper>
              </Box>
            </ListItem>
          </React.Fragment>
        ))}

        {question && (
          <ListItem>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5, maxWidth: '80%',
                  bgcolor: isFullscreen ? 'rgba(0,0,0,0.35)' : (theme) =>
                    theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                  color: isFullscreen ? '#fff' : 'text.primary',
                  boxShadow: 'none', borderRadius: 2
                }}
              >
                <Typography variant="caption" color={isFullscreen ? "inherit" : "text.secondary"}>
                  Interviewer (typing...)
                </Typography>
                <ReactMarkdown>{question}</ReactMarkdown>
              </Paper>
            </Box>
          </ListItem>
        )}
        {answers && (
          <ListItem>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5, maxWidth: '80%',
                  bgcolor: isFullscreen ? 'rgba(152, 170, 255, 0.7)' : 'primary.main',
                  color: isFullscreen ? '#fff' : 'primary.contrastText',
                  opacity: isFullscreen ? 0.9 : 0.7,
                  boxShadow: 'none', borderRadius: 2
                }}
              >
                <Typography variant="caption">Your Answer (in progress...)</Typography>
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

export default LiveInterviewTranscription;
