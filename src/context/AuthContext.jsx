import React, { createContext, useContext, useState, useEffect } from 'react';
import LZString from "lz-string";
import { jwtDecode } from "jwt-decode"; 
import { authService, subscriptionService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState(null); 
  const [loading, setLoading] = useState(true);

  // Helper: Check if token is expired
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  };

  // Helper: Fetch latest usage stats
  const refreshUsage = async () => {
    try {
      const response = await subscriptionService.getUsageSummary();
      if (response.data.success) {
        setUsage(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    }
  };

  // NEW: Fetch latest User Profile from Backend
  const refreshProfile = async () => {
    try {
      // Assuming you have an endpoint like GET /Auth/me or /Auth/profile
      // If not, you can rely on manual updates using updateUser() below
      const response = await authService.getProfile(); 
      if (response.data && response.data.success) {
         const freshUserData = response.data.data;
         // Preserve the token if the backend doesn't send a new one
         if (!freshUserData.token && user?.token) {
             freshUserData.token = user.token;
         }
         updateUser(freshUserData);
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  };

  // NEW: Manual Update Helper (Merges new data with existing user)
  const updateUser = (newData) => {
    setUser((prevUser) => {
        if (!prevUser) return null;
        
        const updatedUser = { ...prevUser, ...newData };
        
        // Handle compression if course material is being updated
        if (newData.courseMaterialText && !newData.isCompressed) { // flag to avoid double compression
             updatedUser.courseMaterialText = LZString.decompressFromUTF16(newData.courseMaterialText);
        }

        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
    });
  };

  useEffect(() => {
    const initAuth = async () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);

          if (parsedUser.token && !isTokenExpired(parsedUser.token)) {
              
              if (parsedUser.courseMaterialText) {
                parsedUser.courseMaterialText = LZString.decompressFromUTF16(parsedUser.courseMaterialText);
              }
              
              setUser(parsedUser);
              
              // Fetch usage
              try {
                const API_URL = process.env.REACT_APP_API_URL;
                const usageRes = await fetch(`${API_URL}/Subscription/usage`, {
                    headers: { 'Authorization': `Bearer ${parsedUser.token}` }
                });
                const usageData = await usageRes.json();
                if(usageData.success) setUsage(usageData.data);
              } catch(e) { 
                console.error("Usage fetch error", e); 
              }

          } else {
              console.warn("Session expired. Clearing storage.");
              localStorage.removeItem('user');
              setUser(null);
              setUsage(null);
          }

        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const userData = response.data; 

      if (userData && userData.token) {
        if (userData.courseMaterialText) {
          userData.courseMaterialText = LZString.decompressFromUTF16(userData.courseMaterialText);
        }
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        await refreshUsage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await authService.register(name, email, password);
      return response; 
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setUsage(null);
  };

  const updateUserResume = (resumeRawText = "", resumeStructuredData = "{}") => {
      updateUser({ resumeRawText, resumeStructuredData });
  };

  const updateUserCourseMaterial = (courseMaterialText = "") => {
      updateUser({ courseMaterialText });
  };

  const checkAccess = (featureCode) => {
    if (!usage || !usage.features) return false;
    const feature = usage.features.find(f => f.featureCode === featureCode);
    if (feature) {
        if (feature.limit === -1) return true;
        if (feature.remaining > 0) return true;
        return false;
    }
    return false; 
  };

  const checkActive = (featureCode) => {
    if (!usage || !usage.features) return false;
    const feature = usage.features.find(f => f.featureCode === featureCode);
    if (feature) {
        if (feature.isActive) return true;
        return false;
    }
    return false; 
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      usage,
      setUser, 
      updateUser, // Expose this
      refreshProfile, // Expose this
      login, 
      register, 
      logout, 
      loading, 
      updateUserResume, 
      updateUserCourseMaterial,
      refreshUsage,
      checkActive,
      checkAccess 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);