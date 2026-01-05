import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Button, Grid, TextField,
  List, ListItem, ListItemText, ListItemIcon, Divider,
  Stepper, Step, StepLabel, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../context/AuthContext';
import { authService, subscriptionService } from '../services/api';

const steps = ['Account Details', 'Verification', 'Payment'];

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan } = location.state || {};
  const { setUser } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFreeSuccessDialog, setShowFreeSuccessDialog] = useState(false);
  
  // Form States
  const [accountData, setAccountData] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  
  useEffect(() => {
    if (!plan) navigate('/');
  }, [plan, navigate]);

  if (!plan) return null;

  // 1. Register User
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        // Register returns { userId, email, token, ... } in response.data
        const regResponse = await authService.register(accountData.name, accountData.email, accountData.password);
        
        // Ensure we handle the specific API response structure
        if (regResponse.status === 201 || regResponse.data.token) {
            // Save user immediately to allow API calls
            const userData = regResponse.data;
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData); // Update context

            // Send OTP
            await authService.sendOtp(accountData.email);
            setActiveStep(1); // Move to OTP
        } else {
            setError("Registration failed.");
        }
    } catch (err) {
        setError(err.response?.data?.error || "Registration error.");
    } finally {
        setIsLoading(false);
    }
  };

  // 2. Verify OTP & Trigger Stripe
  const handleOtpVerify = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // A. Verify OTP
      const verifyRes = await authService.verifyOtp(accountData.email, otp);
      
      if (verifyRes.data.success) {
        
        // B. Set User Context (User is now verified and has Free plan from backend)
        // const storedUser = JSON.parse(localStorage.getItem('user'));
        // if (storedUser) {
        //     // Update plan name in local storage/context to Free initially
        //     storedUser.planName = "Free"; 
        //     localStorage.setItem('user', JSON.stringify(storedUser));
        //     setUser(storedUser);
        // }

        // C. CHECK PLAN TYPE
        // If the selected plan price is 0, we are done!
        if (plan.price === 0) {
            setActiveStep(2); // Move to finish step
            // Optional: Show a success message or redirect immediately
            setShowFreeSuccessDialog(true);
            // alert("Account verified! Welcome to the Free Plan.");
            // navigate('/login'); 
            return;
        }

        // D. If Paid Plan -> Trigger Upgrade
        setActiveStep(2); // Move to "Redirecting" step visually
        
        // Use the token we just set in Context
        const stripeRes = await subscriptionService.createCheckoutSession(plan.subscriptionPlanId);
        
        if (stripeRes.data.success && stripeRes.data.data) {
             window.location.href = stripeRes.data.data;
        } else {
             setError("Account verified (Free Plan active), but payment setup failed. Please login to upgrade manually.");
             setTimeout(() => navigate('/login'), 3000);
        }

      } else {
        setError("Invalid OTP.");
      }
    } catch (err) {
      console.error(err);
      setError("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeSuccessClose = () => {
    setShowFreeSuccessDialog(false);
    navigate('/dashboard?payment=success'); // User is already logged in via Register step
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Account Details
        return (
          <form onSubmit={handleAccountSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                  fullWidth required label="Full Name" 
                  value={accountData.name} 
                  onChange={e => setAccountData({...accountData, name: e.target.value})} 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth required type="email" label="Email" 
                  value={accountData.email} 
                  onChange={e => setAccountData({...accountData, email: e.target.value})} 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth required type="password" label="Password" 
                  value={accountData.password} 
                  onChange={e => setAccountData({...accountData, password: e.target.value})} 
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1 }}>
                  By clicking "Create Account", you agree to our{' '}
                  <span 
                    style={{ 
                      color: '#1976d2', 
                      cursor: 'pointer', 
                      textDecoration: 'underline', 
                      fontWeight: 'bold' 
                    }}
                    onClick={() => window.open('/terms', '_blank')}
                  >
                    Terms of Service & Acceptable Usage Policy
                  </span>.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Button fullWidth type="submit" variant="contained" size="large" disabled={isLoading}>
                  {isLoading ? <CircularProgress size={24} /> : "Create Account"}
                </Button>
              </Grid>
            </Grid>
          </form>
        );
      case 1: // Verification
        return (
          <Box textAlign="center">
            <Typography variant="body1" gutterBottom>Enter the code sent to {accountData.email}</Typography>
            <TextField 
              fullWidth label="OTP" value={otp} 
              onChange={e => setOtp(e.target.value)} 
              sx={{ mt: 2, mb: 2 }} 
              inputProps={{ style: { textAlign: 'center', letterSpacing: 5, fontSize: 20 } }}
            />
            <Button fullWidth variant="contained" size="large" onClick={handleOtpVerify} disabled={isLoading}>
              {isLoading ? "Redirecting to Payment..." : "Verify & Pay"}
            </Button>
          </Box>
        );
      case 2: // Redirecting
         return (
             <Box textAlign="center" py={4}>
                 <CircularProgress />
                 <Typography mt={2}>Redirecting to secure payment...</Typography>
             </Box>
         );
      default: return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Container maxWidth="lg">
        <Dialog
            open={showFreeSuccessDialog}
            onClose={() => {}} // Force user to click button
            aria-labelledby="free-plan-success-title"
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
            <DialogTitle id="free-plan-success-title" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '1.5rem', textAlign: 'center' }}>
                Welcome Aboard! 🎉
            </DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ textAlign: 'center', fontSize: '1.1rem', color: 'text.primary' }}>
                    Your account has been verified successfully.
                    <br /><br />
                    You are now on the <strong>Free Plan</strong>. You can start practicing immediately or upgrade anytime to unlock more features.
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
                <Button 
                    onClick={handleFreeSuccessClose} 
                    variant="contained" 
                    color="primary"
                    size="large"
                    autoFocus
                    sx={{ px: 4, borderRadius: 2 }}
                >
                    Go to Dashboard
                </Button>
            </DialogActions>
        </Dialog>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4, color: 'primary.main' }}>
          <SmartToyIcon sx={{ mr: 1.5, fontSize: 36 }} />
          <Typography variant="h4" fontWeight="bold">Kloud Koach</Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {/* Plan Summary */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold">Selected Plan</Typography>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="baseline">
                <Typography variant="h5" color="primary">{plan.title}</Typography>
                <Typography variant="h4" fontWeight="bold">${plan.price}<span style={{fontSize:'1rem', color:'gray'}}>/mo</span></Typography>
              </Box>
              <List dense>
                {plan.features.map((f, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemIcon sx={{minWidth:30}}><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary={f} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Steps */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 4 }}>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
              </Stepper>

              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              {renderStepContent(activeStep)}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default PaymentPage;