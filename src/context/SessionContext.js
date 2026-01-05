import React, { createContext, useContext, useRef, useCallback } from 'react';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  // Use a ref to store the stop function. This avoids re-renders.
  const activeStopSession = useRef(null);

  // A stable function to set the active stop function
  const setActiveStopSession = useCallback((stopFunction) => {
    activeStopSession.current = stopFunction;
  }, []);

  const value = {
    activeStopSession,
    setActiveStopSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);