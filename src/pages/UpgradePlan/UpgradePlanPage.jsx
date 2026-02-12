import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Button, Card, CardContent,
  List, ListItem, ListItemIcon, ListItemText, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { subscriptionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Payment, Upgrade, Stars, ArrowDownward, History, WarningAmber } from '@mui/icons-material';

const UpgradePlanPage = () => {
  const { user, usage, refreshProfile, refreshUsage } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');

  // Confirmation States
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isDowngradeFlow, setIsDowngradeFlow] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (searchParams.get('success') === 'true' || searchParams.get('upgrade') === 'success') {
        setLoading(true);
        try {
          await refreshProfile();
          await refreshUsage();
          navigate('/dashboard', { replace: true });
        } catch (e) {
          console.error("Post-action refresh failed", e);
          setLoading(false);
        }
      } else {
        fetchPlans();
      }
    };
    checkStatus();
  }, [searchParams, navigate, refreshProfile, refreshUsage]);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionService.getPlans();
      if (response.data.success) {
        setPlans(response.data.data.sort((a, b) => a.priority - b.priority));
      }
    } catch (err) {
      setError("Failed to load plans.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (plan) => {
    const currentPlanName = user?.planName?.toLowerCase() || '';
    const targetPlanName = plan.name?.toLowerCase() || '';
    const isPaidUser = currentPlanName !== 'free' && currentPlanName !== '';

    setSelectedPlan(plan);

    // --- CRITICAL DOWNGRADE CHECK ---
    const currentPlanData = plans.find(p => p.name?.toLowerCase() === currentPlanName);
    const isDowngrade = (currentPlanName === 'ultra' && targetPlanName === 'pro') ||
      (isPaidUser && plan.priority < (currentPlanData?.priority || 0));

    if (isPaidUser) {
      setIsDowngradeFlow(isDowngrade);
      setConfirmOpen(true);
    } else {
      initiateCheckout(plan.subscriptionPlanId);
    }
  };

  const initiateCheckout = async (planId) => {
    setProcessingId(planId);
    setError('');
    try {
      const response = await subscriptionService.createCheckoutSession(planId);
      if (response.data.success && response.data.data) {
        window.location.href = response.data.data;
      } else {
        setError("Failed to initiate secure checkout.");
        setProcessingId(null);
      }
    } catch (err) {
      setError("Payment service unavailable.");
      setProcessingId(null);
    }
  };

  const handleExecuteChange = async (immediate = false) => {
    if (!selectedPlan) return;

    setConfirmOpen(false);
    setProcessingId(selectedPlan.subscriptionPlanId);
    setError('');

    try {
      let response;
      if (isDowngradeFlow) {
        response = await subscriptionService.executeDowngrade(selectedPlan.subscriptionPlanId, immediate);
      } else {
        response = await subscriptionService.executeUpgrade(selectedPlan.subscriptionPlanId);
      }

      if (response.data.success) {
        // refreshUsage now internally syncs the user state in AuthContext
        await refreshUsage();
        await refreshProfile();
        navigate(`/dashboard?${isDowngradeFlow ? 'downgrade' : 'upgrade'}=success`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during the plan change.");
    } finally {
      setProcessingId(null);
      setIsDowngradeFlow(false);
    }
  };

  const handleCancelScheduled = async () => {
    setProcessingId('cancel-scheduled');
    try {
      const response = await subscriptionService.cancelScheduledDowngrade();
      if (response.data.success) {
        await refreshUsage();
        await refreshProfile();
      }
    } catch (err) {
      setError("Failed to cancel scheduled change.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <Box p={5} textAlign="center"><CircularProgress /></Box>;

  // Data from your specific usage endpoint response
  const pendingPlanName = usage?.pendingDowngradePlanName;
  const downgradeDate = usage?.downgradeEffectiveDate;
  // QUICK FIX: If a downgrade is already effective in the future, lock other downgrades
  const isDowngradeAlreadyScheduled = !!downgradeDate;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" align="center" fontWeight="bold" gutterBottom>
        Subscription Plans
      </Typography>

      {downgradeDate && (
        <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 4, borderRadius: 2, maxWidth: 800, mx: 'auto' }}>
          Scheduled downgrade {pendingPlanName ? `to ${pendingPlanName}` : ''} on {new Date(downgradeDate).toLocaleDateString()}.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>{error}</Alert>}

      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {plans.map((plan) => {
          if (plan.name?.toLowerCase() === 'free' || !plan.isActive) return null;

          const currentPlanName = user?.planName?.toLowerCase() || '';
          const targetPlanName = plan.name?.toLowerCase() || '';
          const isCurrent = currentPlanName === targetPlanName;
          const isTargetOfDowngrade = pendingPlanName?.toLowerCase() === targetPlanName;
          const isProcessing = processingId === plan.subscriptionPlanId;

          const currentPlanData = plans.find(p => p.name?.toLowerCase() === currentPlanName);
          const isDowngrade = (currentPlanName === 'ultra' && targetPlanName === 'pro') ||
            (currentPlanData && plan.priority < currentPlanData.priority);

          // BUTTON DISABLE LOGIC
          // Disable if: 
          // 1. Current plan
          // 2. Global processing is happening
          // 3. A downgrade is already scheduled AND this specific card is a downgrade target (prevents double downgrade)
          const disableAction = isCurrent || isProcessing || (isDowngradeAlreadyScheduled && isDowngrade);

          return (
            <Grid item xs={12} md={4} key={plan.subscriptionPlanId}>
              <Card
                elevation={isCurrent ? 8 : 2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 4,
                  border: isCurrent ? '2px solid #7b1fa2' : '1px solid #e0e0e0',
                  position: 'relative',
                  opacity: (isDowngradeAlreadyScheduled && !isTargetOfDowngrade && !isCurrent) ? 0.6 : 1
                }}
              >
                {isCurrent && (
                  <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', color: '#7b1fa2' }}>
                    <Stars fontSize="small" />
                    <Typography variant="caption" fontWeight="bold" ml={0.5}>CURRENT</Typography>
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography variant="h5" fontWeight="bold">{plan.name}</Typography>
                  <Typography variant="h3" fontWeight="bold" my={2}>
                    ${plan.price}<Typography component="span" variant="body1" color="text.secondary">/mo</Typography>
                  </Typography>

                  <List dense>
                    {plan.features
                      .filter(f => f.isActive && (f.limitValue > 0 || f.limitValue === -1))
                      .map((feature, i) => (
                        <ListItem key={i} disableGutters>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={feature.displayName}
                            secondary={feature.limitValue === -1 ? "Unlimited" : null}
                          />
                        </ListItem>
                      ))}
                  </List>
                </CardContent>

                <Box p={3} pt={0}>
                  {isCurrent && isDowngradeAlreadyScheduled ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      startIcon={processingId === 'cancel-scheduled' ? <CircularProgress size={20} /> : <History />}
                      onClick={handleCancelScheduled}
                      disabled={processingId === 'cancel-scheduled'}
                    >
                      Cancel Downgrade
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant={isCurrent ? "outlined" : "contained"}
                      color={isDowngrade ? "warning" : "primary"}
                      size="large"
                      disabled={disableAction}
                      onClick={() => handleAction(plan)}
                      startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> :
                        (isCurrent ? <Stars /> : isTargetOfDowngrade ? <History /> : isDowngrade ? <ArrowDownward /> : <Upgrade />)}
                      sx={{ borderRadius: 8, py: 1.5 }}
                    >
                      {isCurrent
                        ? "Active Plan"
                        : (isDowngradeAlreadyScheduled && isDowngrade)
                          ? "Downgrade Pending"
                          : isDowngrade ? "Downgrade" : "Upgrade"}
                    </Button>
                  )}
                  {isDowngradeAlreadyScheduled && isDowngrade && !isCurrent && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                      Cancel current scheduled change to select this plan.
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onClose={() => !processingId && setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          {isDowngradeFlow ? <WarningAmber color="warning" /> : <Upgrade color="primary" />}
          Confirm Plan Change
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You are switching to the <strong>{selectedPlan?.name} Plan</strong>.
          </Typography>

          {isDowngradeFlow ? (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 2, color: 'warning.dark' }}>
              <Typography variant="body2" fontWeight="bold">Downgrade Notice:</Typography>
              <Typography variant="body2">
                Limits will be reduced. Choose to apply this now (Immediate) or at the end of your billing cycle (Scheduled).
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Your account will be upgraded immediately.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 1 }}>
          {isDowngradeFlow ? (
            <>
              <Button fullWidth variant="contained" color="warning" onClick={() => handleExecuteChange(true)}>
                Downgrade Immediately
              </Button>
              <Button fullWidth variant="outlined" onClick={() => handleExecuteChange(false)}>
                Downgrade at End of Cycle
              </Button>
            </>
          ) : (
            <Button fullWidth variant="contained" color="primary" onClick={() => handleExecuteChange()}>
              Confirm Upgrade
            </Button>
          )}
          <Button fullWidth onClick={() => setConfirmOpen(false)} color="inherit">Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UpgradePlanPage;