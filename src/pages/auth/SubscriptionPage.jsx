// src/pages/auth/SubscriptionPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider
} from '@mui/material';
import AuthLayout from './AuthLayout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../../services/api';

const SubscriptionPage = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const result = await api.subscription.getPlans();
        if (result.success) {
          setPlans(result.data);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        setError('Failed to load subscription plans');
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !selectedPlan) {
      setError('Please select a plan and enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // This is a mock payment processing
      // In production, integrate with Stripe/PayPal
      const paymentToken = 'mock_payment_token_' + Date.now();
      
      const result = await api.subscription.createSubscription(
        email, 
        selectedPlan, 
        paymentToken
      );
      
      if (result.success) {
        // Redirect to OTP verification
        navigate('/register', { 
          state: { 
            email: email,
            subscriptionId: result.data.subscriptionId 
          } 
        });
      } else {
        setError(result.error || 'Failed to create subscription');
      }
    } catch (error) {
      setError('Error processing subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose your plan to get started">
      <Box sx={{ mb: 4, width: '100%' }}>
        <Typography component="h1" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Select Subscription Plan
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose a plan that fits your needs. After payment, you'll receive OTP to complete registration.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 3 }}
            helperText="OTP will be sent to this email for verification"
          />

          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
              Select a Plan
            </FormLabel>
            
            {loadingPlans ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress />
              </Box>
            ) : (
              <RadioGroup
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                sx={{ width: '100%' }}
              >
                <Grid container spacing={2}>
                  {plans.map((plan) => (
                    <Grid item xs={12} md={6} key={plan.subscriptionPlanId}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          border: selectedPlan === plan.subscriptionPlanId.toString() ? 
                            '2px solid #7b1fa2' : '1px solid #e0e0e0',
                          transition: 'all 0.3s',
                          height: '100%'
                        }}
                      >
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Radio 
                              value={plan.subscriptionPlanId.toString()} 
                              color="primary"
                            />
                            <Typography variant="h6" fontWeight="bold">
                              {plan.name}
                            </Typography>
                          </Box>
                          
                          <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                            ${plan.price}
                            <Typography component="span" variant="body2" color="text.secondary">
                              /{plan.billingCycle}
                            </Typography>
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {plan.description}
                          </Typography>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Box>
                            {plan.features.map((feature, index) => (
                              <Box key={index} display="flex" alignItems="center" mb={1}>
                                <CheckCircleIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                                <Typography variant="body2">
                                  {feature.displayName}: {feature.limitValue === -1 ? 'Unlimited' : feature.limitValue} {feature.unit}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>
            )}
          </FormControl>
        </Paper>

        <Button 
          type="submit" 
          fullWidth 
          variant="contained" 
          size="large"
          sx={{ 
            py: 1.5, 
            borderRadius: '12px', 
            fontSize: '1rem',
            background: 'linear-gradient(90deg, #7b1fa2 0%, #ad1457 100%)',
            boxShadow: '0 4px 12px rgba(123, 31, 162, 0.3)'
          }} 
          disabled={loading || loadingPlans || !selectedPlan || !email}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Purchase & Continue'}
        </Button>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Already have a subscription?{' '}
            <Button 
              variant="text" 
              size="small" 
              onClick={() => navigate('/login')}
              sx={{ fontWeight: 'bold' }}
            >
              Login here
            </Button>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default SubscriptionPage;