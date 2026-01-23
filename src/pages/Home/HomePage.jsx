import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  useTheme,
  Chip,
  Backdrop,         // <--- 1. Added
  CircularProgress  // <--- 2. Added
} from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import SchoolIcon from '@mui/icons-material/School';
import LockIcon from '@mui/icons-material/Lock';
import MicIcon from '@mui/icons-material/Mic';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useAuth } from '../../context/AuthContext';
import UsageMonitor from '../../components/common/UsageMonitor';

const HomePage = () => {
  const theme = useTheme();
  const { checkAccess, checkActive, user, refreshProfile, refreshUsage } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // <--- 3. New State

  // Handle Payment Success Logic
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (searchParams.get('payment') === 'success') {
        setIsProcessingPayment(true); // <--- Start Loading

        try {
          // A. Refresh Data Immediately
          await refreshProfile(); // Get new Plan Name
          await refreshUsage();   // Get new Usage Limits

          // B. Show Success Message
          setShowSuccessDialog(true);

          // C. Clean URL (Remove ?payment=success so it doesn't trigger again on reload)
          navigate('/dashboard', { replace: true });
        } catch (error) {
          console.error("Error refreshing subscription data:", error);
        } finally {
          setIsProcessingPayment(false); // <--- Stop Loading
        }
      }
    };

    handlePaymentSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handlePaymentSuccessClose = () => {
    setShowSuccessDialog(false);
  };

  const options = [
    {
      title: 'Live Interview Co-Pilot',
      description: 'Start a real-time interview session with our AI.',
      path: '/dashboard/interview',
      featureCode: 'LIVE_INTERVIEW',
      icon: <RecordVoiceOverIcon sx={{ fontSize: 40 }} />,
    },
    {
      title: 'Interview Preparation',
      description: 'Prepare for your interview with targeted practice.',
      path: '/dashboard/interview-preparation',
      featureCode: 'INTERVIEW_PREP',
      icon: <ModelTrainingIcon sx={{ fontSize: 40 }} />,
    },
    {
      title: 'AI Resume Builder',
      description: 'Build, optimize, and export ATS-friendly resumes instantly.',
      path: '/dashboard/resume-builder',
      featureCode: 'RESUME_BUILDER',
      icon: <AutoFixHighIcon sx={{ fontSize: 40 }} />,
    },
    // {
    //   title: 'Exam Preparation',
    //   description: 'Prepare for your exams with AI-powered practice sessions.',
    //   path: '/dashboard/exam-preparation',
    //   featureCode: 'EXAM_PREP',
    //   icon: <SchoolIcon sx={{ fontSize: 40 }} />,
    // },
    {
      title: 'Elocution Practice',
      description: 'Improve speech clarity and pronunciation with AI feedback.',
      path: '/dashboard/elocution-practice',
      featureCode: 'ELOCUTION_PRACTICE',
      icon: <MicIcon sx={{ fontSize: 40 }} />,
    },
    {
      title: 'Resume Optimizer',
      description: 'AI-powered resume analysis and optimization suggestions.',
      path: '/dashboard/resume-optimizer',
      featureCode: 'RESUME_OPTIMIZER',
      icon: <AutoFixHighIcon sx={{ fontSize: 40 }} />,
    },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>

      {/* --- NEW: Processing Backdrop --- */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column'
        }}
        open={isProcessingPayment}
      >
        <CircularProgress color="inherit" size={60} />
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold' }}>
          Finalizing your upgrade...
        </Typography>
      </Backdrop>
      {/* -------------------------------- */}

      {/* --- SUCCESS DIALOG --- */}
      <Dialog
        open={showSuccessDialog}
        onClose={handlePaymentSuccessClose}
        aria-labelledby="payment-success-title"
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }
          }
        }}
        PaperProps={{
          elevation: 24,
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle id="payment-success-title" sx={{ color: 'success.main', fontWeight: 'bold', textAlign: 'center' }}>
          Upgrade Successful! 🎉
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ textAlign: 'center' }}>
            Your plan has been updated. All new features and limits are <strong>active now</strong>.
            <br /><br />
            You can start using them immediately!
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button
            onClick={handlePaymentSuccessClose}
            variant="contained"
            color="primary"
            autoFocus
            sx={{ px: 4, borderRadius: 2 }}
          >
            Let's Start
          </Button>
        </DialogActions>
      </Dialog>
      {/* --------------------------- */}

      {/* Welcome Section */}
      <Box mb={4} textAlign="center">
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 800, color: 'primary.main' }}
        >
          Welcome back, {user?.name?.split(' ')[0] || 'User'}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ready to accelerate your career? Select a module below.
        </Typography>
      </Box>

      {/* Usage Monitor */}
      <Box mb={4} maxWidth="sm" mx="auto">
        <UsageMonitor />
      </Box>

      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {options.map((option) => {
          // Check access based on usage data
          const isAllowed = checkAccess(option.featureCode);
          const planIsActive = checkActive(option.featureCode);
          const allowedActive = isAllowed && planIsActive;
          const allowedInactive = isAllowed && !planIsActive;
          const notAllowedActive = !isAllowed && planIsActive;
          const notAllowedInactive = !isAllowed && !planIsActive;

          return (
            <Grid item key={option.title} xs={12} sm={6} md={4} sx={{ display: 'flex' }}>
              <Card
                elevation={0}
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  bgcolor: 'background.paper',
                  transition: 'all 0.3s ease-in-out',

                  // --- Styling for Locked vs Unlocked ---
                  opacity: isAllowed ? 1 : 0.75,
                  filter: isAllowed ? 'none' : 'grayscale(90%)',

                  '&:hover': {
                    transform: 'translateY(-8px)',
                    filter: 'none',
                    opacity: 1,
                    borderColor: isAllowed ? 'primary.main' : 'secondary.main',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 12px 30px rgba(0,0,0,0.5)'
                      : '0 12px 30px rgba(123, 31, 162, 0.2)',
                  },
                }}
              >
                <CardActionArea
                  component={planIsActive ? RouterLink : 'div'}
                  to={allowedActive ? option.path : '/dashboard/upgrade'}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start',
                  }}
                >
                  <CardContent
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flexGrow: 1
                    }}
                  >
                    <Box
                      sx={{
                        mb: 2,
                        p: 2,
                        borderRadius: '50%',
                        bgcolor: isAllowed
                          ? (theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light')
                          : 'grey.300',
                        color: 'white',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}
                    >
                      {isAllowed ? React.cloneElement(option.icon, { color: 'inherit' }) : <LockIcon fontSize="large" />}
                    </Box>

                    <Typography
                      gutterBottom
                      variant="h6"
                      component="div"
                      sx={{ fontWeight: 'bold', color: 'text.primary' }}
                    >
                      {option.title}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {option.description}
                    </Typography>

                    {!isAllowed && planIsActive && (
                      <Chip
                        label="Upgrade Plan"
                        size="small"
                        color="secondary"
                        variant="filled"
                        clickable
                        sx={{ mt: 'auto', fontWeight: 'bold' }}
                      />
                    )}
                    {notAllowedInactive && (
                      <Chip
                        label="Coming Soon"
                        size="small"
                        color="secondary"
                        variant="filled"
                        clickable
                        sx={{ mt: 'auto', fontWeight: 'bold' }}
                      />
                    )}
                    {allowedInactive && (
                      <Chip
                        label="Coming Soon"
                        size="small"
                        color="secondary"
                        variant="filled"
                        clickable
                        sx={{ mt: 'auto', fontWeight: 'bold' }}
                      />
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default HomePage;