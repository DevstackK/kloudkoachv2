import React, { useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  Paper,
  Divider,
  Button,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import DeleteIcon from '@mui/icons-material/Delete';
import './LiveInterviewTranscription.css';

const LiveInterviewTranscription = ({ chatHistory, question, answers, handleClearHistory, isFullscreen, turnStatus }) => {
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, question, answers]);

  const textColor = isFullscreen ? '#fff' : 'text.primary';

  // Helper to get status text based on turnStatus state
  const getStatusText = () => {
    if (turnStatus === "speaking") return "Interviewer is speaking...";
    if (turnStatus === "thinking") return "AI is thinking...";
    if (turnStatus === "responding") return "AI is typing/responding...";
    if (question) return "Interviewer asked:";
    if (answers) return "AI is generated answer:";
    return "Interviewer (typing...)";
  };

  // Common styles for message bubbles to ensure text wraps correctly
  const bubbleStyles = {
    p: 1.5,
    maxWidth: '85%', // Slightly wider for better readability
    boxShadow: 'none',
    borderRadius: 2,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    '& p': {
      marginTop: 0,
      marginBottom: '0.75em',
      '&:last-child': { marginBottom: 0 }
    },
    '& ul, & ol': {
      marginTop: 0,
      marginBottom: '0.75em',
      paddingLeft: '1.5em'
    },
    '& li': {
      marginBottom: '0.25em'
    },
    '& pre': {
      whiteSpace: 'pre-wrap',
      overflowX: 'auto',
      margin: 0,
      mt: 1,
      mb: 1
    }
  };

  return (
    <Box
      className="transcription-container"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: textColor,
      }}
    >
      <Box className="transcription-header" sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2, pb: 1,
        borderBottom: isFullscreen ? '1px solid rgba(255,255,255,0.2)' : '1px solid #ddd',
      }}>
        <Typography variant="h6">Interview Transcript</Typography>
        <Button
          variant="outlined"
          color={isFullscreen ? "secondary" : "error"}
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
        {chatHistory.map((entry) => (
          <React.Fragment key={entry.id}>
            <ListItem sx={{ px: 0 }}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                <Paper
                  elevation={0}
                  sx={{
                    ...bubbleStyles,
                    bgcolor: isFullscreen ? 'rgba(0,0,0,0.35)' : (theme) =>
                      theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                    color: isFullscreen ? '#fff' : 'text.primary',
                  }}
                >
                  <Typography variant="caption" display="block" color={isFullscreen ? "inherit" : "text.secondary"} sx={{ mb: 0.5 }}>
                    Interviewer
                  </Typography>
                  <ReactMarkdown>{entry.question}</ReactMarkdown>
                </Paper>
              </Box>
            </ListItem>

            <ListItem sx={{ px: 0 }}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                <Paper
                  elevation={0}
                  sx={{
                    ...bubbleStyles,
                    bgcolor: isFullscreen ? 'rgba(152, 170, 255, 0.7)' : 'primary.main',
                    color: isFullscreen ? '#fff' : 'primary.contrastText',
                  }}
                >
                  <Typography variant="caption" display="block" sx={{ opacity: 0.8, mb: 0.5 }}>
                    Your Answer (AI)
                  </Typography>
                  <ReactMarkdown>{entry.answer}</ReactMarkdown>
                </Paper>
              </Box>
            </ListItem>
          </React.Fragment>
        ))}

        {question && (
          <ListItem sx={{ px: 0 }}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
              <Paper
                elevation={0}
                sx={{
                  ...bubbleStyles,
                  bgcolor: isFullscreen ? 'rgba(0,0,0,0.35)' : (theme) =>
                    theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                  color: isFullscreen ? '#fff' : 'text.primary',
                }}
              >
                <Typography variant="caption" display="block" color={isFullscreen ? "inherit" : "text.secondary"} sx={{ mb: 0.5, fontWeight: 'bold' }}>
                  {getStatusText()}
                </Typography>
                <ReactMarkdown>{question}</ReactMarkdown>
              </Paper>
            </Box>
          </ListItem>
        )}
        {answers && (
          <ListItem sx={{ px: 0 }}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <Paper
                elevation={0}
                sx={{
                  ...bubbleStyles,
                  bgcolor: isFullscreen ? 'rgba(152, 170, 255, 0.7)' : 'primary.main',
                  color: isFullscreen ? '#fff' : 'primary.contrastText',
                  opacity: isFullscreen ? 0.9 : 0.7,
                }}
              >
                <Typography variant="caption" display="block" sx={{ opacity: 0.8, mb: 0.5 }}>
                  Your Answer (in progress...)
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

export default LiveInterviewTranscription;