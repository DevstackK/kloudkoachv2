import React from 'react';
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
  Stack
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import StarIcon from '@mui/icons-material/Star';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import { useAuth } from '../../context/AuthContext';
import CVManager from '../../components/common/CVManager';
import SessionHistory from '../../components/dashboard/SessionHistory';
import SslStatusCard from '../../components/common/SslStatusCard'; // <--- 1. Import

const UserProfile = () => {
  const { user } = useAuth();
  const theme = useTheme();

  // Helper to get initials
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <Box sx={{ flexGrow: 1, py: 4, px: { xs: 2, md: 4 }, bgcolor: 'background.default' }}>
      <Container maxWidth="xl">
        <Typography variant="h4" fontWeight="800" gutterBottom sx={{ mb: 4 }}>
          My Profile
        </Typography>

        <Grid container spacing={4}>
          
          {/* --- LEFT COLUMN (Sidebar: User Info, Security & CV) --- */}
          <Grid item xs={12} md={4} lg={3}>
            <Stack spacing={3}>
              
              {/* 1. User Info Card */}
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
                    color="secondary" 
                    variant="filled"
                    icon={<StarIcon fontSize="small" />} 
                    sx={{ mt: 2, fontWeight: 'bold' }} 
                  />
                </Box>
              </Paper>

              {/* 2. SSL / Security Status (NEW) */}
              {/* <SslStatusCard /> */}

              {/* 3. CV Manager */}
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

          {/* --- RIGHT COLUMN (Main Content: History) --- */}
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