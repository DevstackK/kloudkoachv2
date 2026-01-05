import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import AuthLayout from './AuthLayout';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await register(name, email, password);
      if (success) navigate('/login');
      else setError('Registration failed. Please try again.');
    } catch (error) {
      setError('Registration error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Join thousands of candidates aceing their interviews.">
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Create Account
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Get started with your free Kloud Koach account.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ width: '100%', mb: 3 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="name"
          label="Full Name"
          name="name"
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
        
        <Button 
          type="submit" 
          fullWidth 
          variant="contained" 
          size="large"
          sx={{ 
            mt: 4, 
            mb: 3, 
            py: 1.5, 
            borderRadius: '12px', 
            fontSize: '1rem',
            background: 'linear-gradient(90deg, #7b1fa2 0%, #ad1457 100%)',
            boxShadow: '0 4px 12px rgba(123, 31, 162, 0.3)'
          }} 
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Get Started'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" variant="body2" sx={{ fontWeight: 'bold', textDecoration: 'none' }}>
              Log in
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default RegisterPage;