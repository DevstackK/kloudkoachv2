import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  Container,
  Avatar,
  Divider,
  ListItemIcon,
  Tooltip
} from '@mui/material';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star'; // For Upgrade
import SettingsIcon from '@mui/icons-material/Settings';

import { useAuth } from '../../context/AuthContext';
import { mainNavLinks, userDropdownLinks } from './navConfig.js';

const Header = ({ onToggleTheme }) => {
  const { logout, user } = useAuth(); // Assuming 'user' has name/email for Avatar
  const navigate = useNavigate();
  const theme = useTheme();
  
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for Mobile Menu (Hamburger)
  const [mobileAnchorEl, setMobileAnchorEl] = useState(null);
  
  // State for User Profile Dropdown (Right side)
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);

  // Handlers
  const handleOpenMobileMenu = (event) => setMobileAnchorEl(event.currentTarget);
  const handleCloseMobileMenu = () => setMobileAnchorEl(null);

  const handleOpenUserMenu = (event) => setUserMenuAnchorEl(event.currentTarget);
  const handleCloseUserMenu = () => setUserMenuAnchorEl(null);

  const handleLogout = () => {
    handleCloseUserMenu();
    handleCloseMobileMenu();
    logout();
    navigate('/'); 
  };

  // Nav Button Styles (Pill shape)
  const getNavStyle = (isActive) => ({
    color: 'white',
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.9rem',
    padding: '8px 20px',
    borderRadius: '30px',
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
    backdropFilter: isActive ? 'blur(4px)' : 'none',
    transition: 'all 0.3s ease',
    border: isActive ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      transform: 'translateY(-1px)',
    },
  });

  return (
    <AppBar position="sticky" elevation={0} sx={{ background: 'linear-gradient(90deg, #4a148c 0%, #7b1fa2 100%)', zIndex: 1201 }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ height: 70, justifyContent: 'space-between' }}>
          
          {/* 1. LEFT: LOGO */}
          <Box 
            component={NavLink} 
            to="/dashboard" 
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'white', zIndex: 2 }}
          >
            <SmartToyIcon sx={{ mr: 1.5, fontSize: 32 }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, letterSpacing: '.05rem', fontSize: '1.2rem' }}>
              Kloud Koach
            </Typography>
          </Box>

          {/* 2. CENTER: MAIN NAVIGATION (Hidden on Mobile) */}
          {!isMobile && (
            <Box sx={{ 
              position: 'absolute', 
              left: '50%', 
              transform: 'translateX(-50%)',
              display: 'flex', 
              gap: 1,
              zIndex: 1
            }}>
              {mainNavLinks.map((link) => (
                <NavLink
                  key={link.title}
                  to={link.path}
                  end={link.path === '/dashboard'}
                  style={({ isActive }) => getNavStyle(isActive)}
                >
                  {link.title}
                </NavLink>
              ))}
            </Box>
          )}

          {/* 3. RIGHT: ACTIONS & DROPDOWN */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, zIndex: 2 }}>
            
            {/* Desktop: Profile Dropdown Trigger */}
            {!isMobile && (
              <>
                <Tooltip title="Account Settings">
                  <IconButton 
                    onClick={handleOpenUserMenu} 
                    sx={{ p: 0, ml: 1, border: '2px solid rgba(255,255,255,0.5)' }}
                  >
                    <Avatar 
                      alt="User" 
                      src={user?.picture} // Optional: User image url 
                      sx={{ bgcolor: 'secondary.main', width: 40, height: 40 }}
                    >
                      {user?.name ? user.name.charAt(0).toUpperCase() : <PersonIcon />}
                    </Avatar>
                  </IconButton>
                </Tooltip>

                {/* USER DROPDOWN MENU */}
                <Menu
                  sx={{ mt: '45px' }}
                  id="menu-appbar"
                  anchorEl={userMenuAnchorEl}
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                  keepMounted
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  open={Boolean(userMenuAnchorEl)}
                  onClose={handleCloseUserMenu}
                  PaperProps={{
                    elevation: 3,
                    sx: { borderRadius: 2, minWidth: 200, mt: 1.5 }
                  }}
                >
                  {/* Dropdown Links */}
                  {userDropdownLinks.map((link) => (
                    <MenuItem 
                      key={link.title} 
                      onClick={() => { handleCloseUserMenu(); navigate(link.path); }}
                    >
                       <ListItemIcon>
                          {/* Optional: Mapping icons to titles */}
                          {link.title.includes('Upgrade') && <StarIcon fontSize="small" />}
                          {link.title.includes('History') && <HistoryIcon fontSize="small" />}
                          {link.title.includes('Profile') && <PersonIcon fontSize="small" />}
                       </ListItemIcon>
                      <Typography textAlign="center">{link.title}</Typography>
                    </MenuItem>
                  ))}
                  
                  <Divider />

                  {/* Theme Switch */}
                  <MenuItem onClick={() => { onToggleTheme(); }}>
                    <ListItemIcon>
                      {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
                    </ListItemIcon>
                    <Typography>Switch Theme</Typography>
                  </MenuItem>

                  {/* Logout */}
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <Typography color="error" fontWeight="bold">Logout</Typography>
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* Mobile: Hamburger Menu */}
            {isMobile && (
              <IconButton size="large" onClick={handleOpenMobileMenu} color="inherit">
                <MenuIcon />
              </IconButton>
            )}
          </Box>

          {/* 4. MOBILE MENU (Combined) */}
          <Menu
            anchorEl={mobileAnchorEl}
            open={Boolean(mobileAnchorEl)}
            onClose={handleCloseMobileMenu}
            sx={{ display: { xs: 'block', md: 'none' } }}
            PaperProps={{
               elevation: 3,
               sx: { borderRadius: 2, mt: 1, minWidth: 200 }
            }}
          >
            {/* Show ALL links on mobile */}
            {[...mainNavLinks, ...userDropdownLinks].map((link) => (
              <MenuItem 
                key={link.title} 
                onClick={handleCloseMobileMenu} 
                component={NavLink} 
                to={link.path}
                end={link.path === '/dashboard'}
                sx={{ '&.active': { bgcolor: 'primary.light', color: 'white' } }}
              >
                <Typography>{link.title}</Typography>
              </MenuItem>
            ))}
            
            <Divider />
            
            <MenuItem onClick={onToggleTheme}>
               <ListItemIcon>
                  {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
               </ListItemIcon>
              <Typography>Switch Theme</Typography>
            </MenuItem>

            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                  <LogoutIcon fontSize="small" color="error" />
               </ListItemIcon>
              <Typography color="error" fontWeight="bold">Logout</Typography>
            </MenuItem>
          </Menu>

        </Toolbar>
      </Container>
    </AppBar>
  );
};
export default Header;