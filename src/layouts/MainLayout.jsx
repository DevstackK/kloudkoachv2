import { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { useSession } from '../context/SessionContext';

// This component will now receive the theme toggle handler
const MainLayout = ({ onToggleTheme }) => {
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const { activeStopSession } = useSession();

  // 4. Add this useEffect for global cleanup
  useEffect(() => {
    const handleUnload = (event) => {
      // Check if there's an active stop function
      if (activeStopSession.current) {
        activeStopSession.current(); // Call the stop function
      }
    };

    // Add listener for tab/browser close or page refresh
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [activeStopSession]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        color: 'text.primary',
      }}
    >
      {/* Show Header & Footer only if not fullscreen */}
    <Header
        onToggleTheme={onToggleTheme}
    />

      {/* Child route content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet context={{ isFullscreenMode, setIsFullscreenMode }} />
      </Box>

      {!isFullscreenMode && <Footer />}
    </Box>
  );
};

export default MainLayout;
