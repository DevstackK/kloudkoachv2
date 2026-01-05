import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Box,
} from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';

const HomePage = () => {
  const options = [
    {
      title: 'Live Interview Co-Pilot',
      description: 'Start a real-time interview session with our AI.',
      path: '/interview',
      icon: <RecordVoiceOverIcon sx={{ fontSize: 60 }} color="primary" />,
    },
    {
      title: 'Interview Preparation',
      description: 'Prepare for your interview with targeted practice.',
      path: '/interview-preparation',
      icon: <ModelTrainingIcon sx={{ fontSize: 60 }} color="secondary" />,
    },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 2 }}>
        Welcome!
      </Typography>
      <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 6 }}>
        How would you like to proceed today?
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        {options.map((option) => (
          <Grid item key={option.title} xs={12} sm={6}>
            <Card
              elevation={3}
              sx={{
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea component={RouterLink} to={option.path} sx={{ p: 4, textAlign: 'center' }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ mb: 2 }}>
                    {option.icon}
                  </Box>
                  <Typography gutterBottom variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                    {option.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default HomePage;
