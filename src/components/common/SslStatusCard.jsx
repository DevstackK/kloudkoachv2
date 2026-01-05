import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress, Alert } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import GppGoodIcon from '@mui/icons-material/GppGood';
import ErrorIcon from '@mui/icons-material/Error';
import { securityService } from '../../services/api';

const SslStatusCard = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSsl = async () => {
      try {
        const res = await securityService.getSslStatus();
        if (res.data.success) {
          setStatus(res.data.data);
        }
      } catch (err) {
        console.error("SSL Check failed", err);
      } finally {
        setLoading(false);
      }
    };
    checkSsl();
  }, []);

  if (loading) return <CircularProgress size={20} />;
  if (!status) return null;

  const isHealthy = status.isSecure && status.daysRemaining > 30;
  const color = isHealthy ? 'success.main' : status.daysRemaining > 0 ? 'warning.main' : 'error.main';

  return (
    <Card variant="outlined" sx={{ borderColor: color, minWidth: 250 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          {isHealthy ? <GppGoodIcon color="success" sx={{ mr: 1 }} /> : <LockIcon sx={{ mr: 1, color }} />}
          <Typography variant="h6" fontWeight="bold">
            SSL Certificate
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Issued by: {status.issuer?.split(',')[0].replace('CN=', '')}
        </Typography>

        <Box mt={2}>
           {status.isExpired ? (
             <Alert severity="error">Expired on {new Date(status.validTo).toLocaleDateString()}</Alert>
           ) : (
             <Chip 
               label={`${status.daysRemaining} Days Remaining`} 
               color={status.daysRemaining < 30 ? "warning" : "success"} 
               variant="outlined"
             />
           )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SslStatusCard;