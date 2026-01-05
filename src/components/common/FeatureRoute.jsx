import { useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

const FeatureRoute = ({ children, featureCode }) => {
  const { user, loading, checkAccess, usage } = useAuth();
  const navigate = useNavigate();

  const isAllowed = checkAccess(featureCode);

  if (loading || !usage) return <div>Loading permissions...</div>;

  if (!user) {
    navigate('/login');
    return null;
  }

  if (!isAllowed) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        height="80vh"
        textAlign="center"
        p={3}
      >
        <LockIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h4" gutterBottom fontWeight="bold">Access Denied</Typography>
        <Typography variant="h6" color="text.secondary" mb={4}>
          This feature is not available in your current <b>{user.planName || "Free"}</b> plan or you have reached your usage limit.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return children;
};

export default FeatureRoute;