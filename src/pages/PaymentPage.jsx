import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Button, Grid, TextField,
  List, ListItem, ListItemText, ListItemIcon, Divider,
  Stepper, Step, StepLabel, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Checkbox, FormControlLabel, FormGroup
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GppGoodIcon from '@mui/icons-material/GppGood';
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

  // Integrity Checkbox States
  const [integrityChecked, setIntegrityChecked] = useState({
    practice: false,
    noAssistance: false,
    privacy: false
  });

  // Validation Logic
  const validateName = (name) => /^[a-zA-Z\s]*$/.test(name) && name.trim().length > 2;
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (pw) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/.test(pw);

  const isFormValid =
    validateName(accountData.name) &&
    validateEmail(accountData.email) &&
    validatePassword(accountData.password) &&
    integrityChecked.practice &&
    integrityChecked.noAssistance &&
    integrityChecked.privacy;

  useEffect(() => {
    if (!plan) navigate('/');
  }, [plan, navigate]);

  if (!plan) return null;

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError('');

    try {
      const regResponse = await authService.register(accountData.name, accountData.email, accountData.password);

      if (regResponse.status === 201 || regResponse.data.token) {
        const userData = regResponse.data;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        await authService.sendOtp(accountData.email);
        setActiveStep(1);
      } else {
        setError("Registration failed.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    setIsLoading(true);
    setError('');

    try {
      const verifyRes = await authService.verifyOtp(accountData.email, otp);

      if (verifyRes.data.success) {
        if (plan.price === 0) {
          setActiveStep(2);
          setShowFreeSuccessDialog(true);
          return;
        }

        setActiveStep(2);
        const stripeRes = await subscriptionService.createCheckoutSession(plan.subscriptionPlanId);

        if (stripeRes.data.success && stripeRes.data.data) {
          window.location.href = stripeRes.data.data;
        } else {
          setError("Payment setup failed. Please login to upgrade manually.");
          setTimeout(() => navigate('/login'), 3000);
        }
      } else {
        setError("Invalid OTP.");
      }
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeSuccessClose = () => {
    setShowFreeSuccessDialog(false);
    navigate('/dashboard?payment=success');
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <form onSubmit={handleAccountSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth required label="Full Name"
                  value={accountData.name}
                  error={accountData.name.length > 0 && !validateName(accountData.name)}
                  helperText={accountData.name.length > 0 && !validateName(accountData.name) ? "Letters and spaces only" : ""}
                  onChange={e => setAccountData({ ...accountData, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth required type="email" label="Email"
                  value={accountData.email}
                  error={accountData.email.length > 0 && !validateEmail(accountData.email)}
                  onChange={e => setAccountData({ ...accountData, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth required type="password" label="Password"
                  value={accountData.password}
                  error={accountData.password.length > 0 && !validatePassword(accountData.password)}
                  helperText={accountData.password.length > 0 && !validatePassword(accountData.password) ? "Password must contain at least 8 characters, 1 letter, and 1 number" : ""}
                  onChange={e => setAccountData({ ...accountData, password: e.target.value })}
                />
              </Grid>

              {/* Integrity & Ethical Usage Checkboxes */}
              <Grid item xs={12}>
                <Box sx={{ bgcolor: 'rgba(0, 0, 0, 0.02)', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <GppGoodIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight="bold">Integrity & Ethical Usage Notice</Typography>
                  </Box>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={integrityChecked.practice} onChange={e => setIntegrityChecked({ ...integrityChecked, practice: e.target.checked })} />}
                      label={<Typography variant="caption"><strong>Practice Use Only:</strong> I will only use this for mock interviews, not actual live professional interviews.</Typography>}
                    />
                    <FormControlLabel
                      control={<Checkbox size="small" checked={integrityChecked.noAssistance} onChange={e => setIntegrityChecked({ ...integrityChecked, noAssistance: e.target.checked })} />}
                      label={<Typography variant="caption"><strong>No Covert Assistance:</strong> I will not use AI suggestions to gain unfair advantages in real-world scenarios.</Typography>}
                    />
                    <FormControlLabel
                      control={<Checkbox size="small" checked={integrityChecked.privacy} onChange={e => setIntegrityChecked({ ...integrityChecked, privacy: e.target.checked })} />}
                      label={<Typography variant="caption"><strong>Data Privacy:</strong> I grant permission to record audio for transcription and AI analysis.</Typography>}
                    />
                  </FormGroup>
                </Box>
              </Grid>

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

              <Grid item xs={12}>
                <Button
                  fullWidth type="submit" variant="contained" size="large"
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? <CircularProgress size={24} /> : "Create Account"}
                </Button>
              </Grid>
            </Grid>
          </form>
        );
      case 1:
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
      case 2:
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
          onClose={() => { }}
          aria-labelledby="free-plan-success-title"
          slotProps={{
            backdrop: {
              sx: { backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }
            }
          }}
          PaperProps={{ elevation: 24, sx: { borderRadius: 3, p: 1 } }}
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
            <Button onClick={handleFreeSuccessClose} variant="contained" color="primary" size="large" autoFocus sx={{ px: 4, borderRadius: 2 }}>
              Go to Dashboard
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4, color: 'primary.main' }}>
          <SmartToyIcon sx={{ mr: 1.5, fontSize: 36 }} />
          <Typography variant="h4" fontWeight="bold">Kloud Koach</Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold">Selected Plan</Typography>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="baseline">
                <Typography variant="h5" color="primary">{plan.title}</Typography>
                <Typography variant="h4" fontWeight="bold">${plan.price}<span style={{ fontSize: '1rem', color: 'gray' }}>/mo</span></Typography>
              </Box>
              <List dense>
                {plan.features.map((f, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemIcon sx={{ minWidth: 30 }}><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary={f} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

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