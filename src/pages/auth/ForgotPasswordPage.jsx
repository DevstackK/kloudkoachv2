import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AuthLayout from './AuthLayout';
import { authService } from '../../services/api';

const steps = ['Email', 'Reset Password'];

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const validatePassword = (pw) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/.test(pw);

  // STEP 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.sendOtp(email);
      if (response.data.success) {
        setSuccessMsg(`OTP sent to ${email}`);
        setActiveStep(1);
      } else {
        setError('Failed to send OTP. Please check the email.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error sending OTP. Ensure email is registered.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      // API expects: { email, token, newPassword }
      // "Token" in the backend DTO maps to the OTP code here
      const response = await authService.resetPassword(email, otp, newPassword);

      if (response.data.success) {
        setSuccessMsg("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError("Failed to reset password. OTP might be invalid.");
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Recover your account">
      <Box sx={{ width: '100%', mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to="/login"
          sx={{ mb: 2, pl: 0 }}
        >
          Back to Login
        </Button>

        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Forgot Password
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          {activeStep === 0
            ? "Enter your email address to receive a verification code."
            : "Enter the code sent to your email and your new password."}
        </Typography>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}

        {activeStep === 0 ? (
          /* --- STEP 1 FORM --- */
          <Box component="form" onSubmit={handleSendOtp} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: '12px' }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Send OTP'}
            </Button>
          </Box>
        ) : (
          /* --- STEP 2 FORM --- */
          <Box component="form" onSubmit={handleResetPassword} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="otp"
              label="OTP Code"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputProps={{ style: { letterSpacing: 4 } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={newPassword !== '' && !validatePassword(newPassword)}
              helperText={newPassword !== '' && !validatePassword(newPassword) ? "Password must contain at least 8 characters, 1 letter, and 1 number" : ""}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword !== '' && !validatePassword(confirmPassword)}
              helperText={confirmPassword !== '' && !validatePassword(confirmPassword) ? "Password must contain at least 8 characters, 1 letter, and 1 number" : ""}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: '12px' }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Reset Password'}
            </Button>
          </Box>
        )}
      </Box>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;