import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; // Added useSearchParams
import {
  Box, Container, Typography, Grid, Paper, Button, Card, CardContent,
  List, ListItem, ListItemIcon, ListItemText, CircularProgress, Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import { subscriptionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const UpgradePlanPage = () => {
  const { user, refreshProfile, refreshUsage } = useAuth(); // Import refresh methods
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // 1. Check if returning from Stripe Success
    const checkStripeSuccess = async () => {
        if (searchParams.get('success') === 'true') {
            setLoading(true);
            try {
                // Refresh User Data (Plan Name) and Usage Limits
                await refreshProfile();
                await refreshUsage();
                // Redirect to Dashboard
                navigate('/dashboard');
            } catch (e) {
                console.error("Post-payment refresh failed", e);
                setLoading(false);
            }
        } else {
            fetchPlans();
        }
    };

    checkStripeSuccess();
  }, [searchParams, navigate]);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionService.getPlans();
      if (response.data.success) {
        setPlans(response.data.data);
      }
    } catch (err) {
      setError("Failed to load plans.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    setProcessingId(plan.subscriptionPlanId);
    setError('');

    try {
      const response = await subscriptionService.createCheckoutSession(plan.subscriptionPlanId);
      
      // Redirect to Stripe hosted page
      if (response.data.success && response.data.data) {
         window.location.href = response.data.data; 
      } else {
         setError("Failed to initiate secure checkout.");
         setProcessingId(null);
      }
    } catch (err) {
      console.error(err);
      setError("Payment service unavailable.");
      setProcessingId(null);
    }
  };

  if (loading) return <Box p={5} textAlign="center"><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" align="center" fontWeight="bold" gutterBottom>
        Upgrade Your Plan
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" mb={5}>
        Secure payment processed by Stripe. Cancel anytime.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>{error}</Alert>}

      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {plans.map((plan) => {
           if (plan.name?.toLowerCase() === 'free') return null; // Don't show free plan in upgrades
           
           const isCurrent = user?.planName?.toLowerCase() === plan.name?.toLowerCase();
           const isNotActive = !plan.isActive;
           
           return (
             <Grid item xs={12} md={4} key={plan.subscriptionPlanId}>
               <Card elevation={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, border: isCurrent ? '2px solid #7b1fa2' : 'none' }}>
                 <CardContent sx={{ flexGrow: 1, p: 3 }}>
                   <Typography variant="h5" fontWeight="bold" color="primary">{plan.name}</Typography>
                   <Typography variant="h3" fontWeight="bold" my={2}>
                     ${plan.price}<Typography component="span" variant="body1" color="text.secondary">/mo</Typography>
                   </Typography>
                   
                   <List dense>
                     {plan.features.map((feature, i) => (
                       <ListItem key={i} disableGutters>
                         <ListItemIcon sx={{ minWidth: 32 }}><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                         <ListItemText primary={feature.displayName} />
                       </ListItem>
                     ))}
                   </List>
                 </CardContent>
                 
                 <Box p={3} pt={0}>
                   <Button 
                     fullWidth 
                     variant="contained" 
                     size="large"
                     disabled={isCurrent || (processingId !== null) || isNotActive}
                     onClick={() => handleSubscribe(plan)}
                     startIcon={processingId === plan.subscriptionPlanId ? <CircularProgress size={20} color="inherit"/> : (!isCurrent && <LockIcon />)}
                     sx={{ borderRadius: 8, py: 1.5 }}
                   >
                     {isCurrent ? "Current Plan" : processingId === plan.subscriptionPlanId ? "Processing..." : "Proceed to Checkout"}
                   </Button>
                 </Box>
               </Card>
             </Grid>
           );
        })}
      </Grid>
    </Container>
  );
};

export default UpgradePlanPage;