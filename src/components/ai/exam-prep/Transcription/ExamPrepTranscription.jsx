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
import './ExamPrepTranscription.css';

const ExamPrepTranscription = ({ chatHistory, question, answers, handleClearHistory }) => {
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, question, answers]);

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
        <Typography variant="h6">Exam Preparation Transcript</Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleClearHistory}
          disabled={chatHistory.length === 0}
        >
          Clear Chat
        </Button>
      </Box>

      <Divider />

      <List
        className="transcription-list"
        sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}
      >
        {chatHistory.map((entry, index) => (
          <React.Fragment key={index}>
            <ListItem>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  <Typography variant="caption">Student</Typography>
                  <ReactMarkdown>{entry.question}</ReactMarkdown>
                </Paper>
              </Box>
            </ListItem>
            <ListItem>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    AI Tutor
                  </Typography>
                  <ReactMarkdown>{entry.answer}</ReactMarkdown>
                </Paper>
              </Box>
            </ListItem>
          </React.Fragment>
        ))}

        {question && (
          <ListItem>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <Paper
                elevation={2}
                sx={{
                  p: 1.5,
                  maxWidth: '80%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  opacity: 0.7,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Student (in progress...)
                </Typography>
                <ReactMarkdown>{question}</ReactMarkdown>
              </Paper>
            </Box>
          </ListItem>
        )}
        {answers && (
          <ListItem>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
              <Paper
                elevation={2}
                sx={{
                  p: 1.5,
                  maxWidth: '80%',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                }}
              >
                <Typography variant="caption">AI Tutor (in progress...)</Typography>
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

export default ExamPrepTranscription;