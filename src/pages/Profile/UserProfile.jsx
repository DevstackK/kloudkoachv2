import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Paper,
  Box,
  Avatar,
  Divider,
  Chip,
  useTheme,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Backdrop,
  CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import StarIcon from '@mui/icons-material/Star';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import CancelIcon from '@mui/icons-material/Cancel';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { useAuth } from '../../context/AuthContext';
import { subscriptionService } from '../../services/api';
import CVManager from '../../components/common/CVManager';
import SessionHistory from '../../components/dashboard/SessionHistory';

const UserProfile = () => {
  // 1. ADD 'usage' here so we can access the status we just added to the backend
  const { user, usage, refreshProfile, refreshUsage } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  // --- State Management ---
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openSuccessDialog, setOpenSuccessDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Helper to get initials
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  // --- Handlers ---

  const handleCancelClick = () => {
    setOpenCancelDialog(true);
  };

  const handleReactivateClick = () => {
    navigate('/dashboard/upgrade');
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
  };

  const handleCloseSuccessDialog = () => {
    setOpenSuccessDialog(false);
  };

  // The actual cancellation logic
  const processCancellation = async () => {
    setOpenCancelDialog(false);
    setIsProcessing(true);

    try {
      const response = await subscriptionService.cancelSubscription();

      if (response.data && response.data.success) {
        // Fetch latest details
        await refreshProfile();
        await refreshUsage(); // This updates the 'usage' object

        setSuccessMessage("Subscription cancelled successfully. You will retain access to premium features until the end of your billing period.");
        setOpenSuccessDialog(true);
      } else {
        setSuccessMessage(response.data?.message || "Failed to cancel subscription.");
        setOpenSuccessDialog(true);
      }
    } catch (error) {
      console.error("Cancellation error", error);
      setSuccessMessage("An error occurred while communicating with the server. Please try again later.");
      setOpenSuccessDialog(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Logic for Button State ---
  const isPaidUser = user?.planName && user.planName !== 'Free';

  // 2. UPDATE logic to check 'usage' first (since that's where we added SubscriptionStatus in the backend)
  const isCancelled = usage?.subscriptionStatus === 'cancelled' || user?.status === 'cancelled';

  return (
    <Box sx={{ flexGrow: 1, py: 4, px: { xs: 2, md: 4 }, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">

        {/* --- 1. PROCESSING BACKDROP --- */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column' }}
          open={isProcessing}
        >
          <CircularProgress color="inherit" size={60} />
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold' }}>
            Updating subscription...
          </Typography>
        </Backdrop>

        {/* --- 2. CONFIRMATION DIALOG (Cancel) --- */}
        <Dialog
          open={openCancelDialog}
          onClose={handleCloseCancelDialog}
          PaperProps={{ elevation: 24, sx: { borderRadius: 3, p: 1 } }}
        >
          <Box display="flex" justifyContent="center" mt={2}>
            <Avatar sx={{ bgcolor: 'warning.light', width: 60, height: 60 }}>
              <WarningAmberIcon sx={{ color: 'warning.dark', fontSize: 40 }} />
            </Avatar>
          </Box>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem' }}>
            Cancel Subscription?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ textAlign: 'center', color: 'text.secondary' }}>
              Are you sure you want to cancel?
              <br /><br />
              You will lose access to premium features at the end of your current billing cycle.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 2 }}>
            <Button
              onClick={handleCloseCancelDialog}
              variant="outlined"
              color="inherit"
              sx={{ borderRadius: 2, px: 3 }}
            >
              Keep My Plan
            </Button>
            <Button
              onClick={processCancellation}
              variant="contained"
              color="error"
              autoFocus
              sx={{ borderRadius: 2, px: 3 }}
            >
              Yes, Cancel It
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- 3. SUCCESS / INFO DIALOG --- */}
        <Dialog
          open={openSuccessDialog}
          onClose={handleCloseSuccessDialog}
          PaperProps={{ elevation: 24, sx: { borderRadius: 3, p: 1 } }}
        >
          <Box display="flex" justifyContent="center" mt={2}>
            <Avatar sx={{ bgcolor: 'primary.light', width: 60, height: 60 }}>
              <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 40 }} />
            </Avatar>
          </Box>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem' }}>
            Status Updated
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ textAlign: 'center', color: 'text.primary' }}>
              {successMessage}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
            <Button
              onClick={handleCloseSuccessDialog}
              variant="contained"
              color="primary"
              sx={{ borderRadius: 2, px: 4 }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>


        {/* --- MAIN CONTENT --- */}
        <Typography variant="h4" fontWeight="800" gutterBottom sx={{ mb: 4 }}>
          My Profile
        </Typography>

        <Grid container spacing={4}>

          {/* --- LEFT COLUMN --- */}
          <Grid item xs={12} md={4} lg={3}>
            <Stack spacing={3}>

              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'primary.main',
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      mb: 2,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    {getInitials(user?.name)}
                  </Avatar>

                  <Typography variant="h6" fontWeight="bold">
                    {user?.name || "User Name"}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1} mt={0.5} color="text.secondary">
                    <EmailIcon fontSize="small" />
                    <Typography variant="body2">{user?.email}</Typography>
                  </Box>

                  <Chip
                    label={user?.planName || "Free Plan"}
                    size="small"
                    color={isCancelled ? "warning" : "secondary"}
                    variant="filled"
                    icon={<StarIcon fontSize="small" />}
                    sx={{ mt: 2, fontWeight: 'bold' }}
                  />

                  {/* DYNAMIC BUTTON LOGIC */}
                  {isPaidUser && (
                    <Box mt={3} width="100%">
                      <Divider sx={{ mb: 2 }} />

                      {isCancelled ? (
                        /* REACTIVATE BUTTON */
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          fullWidth
                          startIcon={<AutorenewIcon />}
                          onClick={handleReactivateClick}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Reactivate Subscription
                        </Button>
                      ) : (
                        /* CANCEL BUTTON */
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          fullWidth
                          startIcon={<CancelIcon />}
                          onClick={handleCancelClick}
                        >
                          Cancel Subscription
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </Paper>

              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon color="primary" /> Resume
                </Typography>
                <Box sx={{ '& .MuiPaper-root': { height: 'auto', minHeight: '300px' } }}>
                  <CVManager onCVChange={(val) => console.log("CV Updated")} />
                </Box>
              </Box>

            </Stack>
          </Grid>

          {/* --- RIGHT COLUMN --- */}
          <Grid item xs={12} md={8} lg={9}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                minHeight: '600px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <HistoryIcon color="primary" fontSize="large" />
                <Typography variant="h5" fontWeight="800">
                  Session History
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <SessionHistory isWidget={true} />
            </Paper>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
};

export default UserProfile;