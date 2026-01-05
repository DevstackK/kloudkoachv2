import React, { useState, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ColorModeContext, getTheme } from './context/ThemeContext';
import App from './App.jsx';
import { SessionProvider } from './context/SessionContext.js';

export default function AppWrapper() {
  const [mode, setMode] = useState('light');
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
          <SessionProvider>
            <App />
          </SessionProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}