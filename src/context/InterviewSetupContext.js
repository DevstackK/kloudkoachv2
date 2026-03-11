import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext'; // Import useAuth to get the initial CV

// 1. Define the default state
const initialState = {
  jobRole: '',
  interviewRound: '',
  jobDescription: '',
  cv: '',
};

const InterviewSetupContext = createContext();

export const InterviewSetupProvider = ({ children }) => {
  const { user } = useAuth(); // Get user from AuthContext

  // 2. Initialize state. We set the CV from the user data if it exists.
  const [formData, setFormData] = useState({
    ...initialState,
    cv: user?.resumeRawText || '',
  });

  // 2.5 Sync CV if it's loaded AFTER initial mount (e.g. fresh signup & upload)
  useEffect(() => {
    if (user?.resumeRawText && !formData.cv) {
      setFormData(prev => ({ ...prev, cv: user.resumeRawText }));
    }
  }, [user?.resumeRawText, formData.cv]);

  // 3. Create a function to clear the form (useful for later)
  const clearForm = () => {
    setFormData({
      ...initialState,
      cv: user?.resumeRawText || '', // Reset CV back to user's saved one
    });
  };

  // 4. Memoize the value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    formData,
    setFormData,
    clearForm,
  }), [formData]);

  return (
    <InterviewSetupContext.Provider value={value}>
      {children}
    </InterviewSetupContext.Provider>
  );
};

// 5. Create a custom hook for easy access
export const useInterviewSetup = () => useContext(InterviewSetupContext);