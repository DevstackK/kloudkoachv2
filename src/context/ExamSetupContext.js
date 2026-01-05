import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';

// 1. Define the default state
const initialState = {
  subject: '',
  description: '',
  courseMaterial: '',
};

const ExamSetupContext = createContext();

export const ExamSetupProvider = ({ children }) => {
  const { user } = useAuth();

  // 2. Initialize state. We set the course material from the user data if it exists.
  const [formData, setFormData] = useState({
    ...initialState,
    courseMaterial: user?.courseMaterialText || '',
  });

  // 3. Create a function to clear the form
  const clearForm = () => {
    setFormData({
      ...initialState,
      courseMaterial: user?.courseMaterialText || '', // Reset course material back to user's saved one
    });
  };

  // 4. Memoize the value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    formData,
    setFormData,
    clearForm,
  }), [formData]);

  return (
    <ExamSetupContext.Provider value={value}>
      {children}
    </ExamSetupContext.Provider>
  );
};

// 5. Create a custom hook for easy access
export const useExamSetup = () => useContext(ExamSetupContext);