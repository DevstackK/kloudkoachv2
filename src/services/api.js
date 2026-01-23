import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: (email, password) => api.post('/Auth/login', { email, password }),
  register: (name, email, password) => api.post('/Auth/register', { name, email, password }),
  sendOtp: (email) => api.post('/Auth/send-otp', { email }),
  verifyOtp: (email, otp) => api.post('/Auth/verify-otp', { email, otp }),
  resetPassword: (email, token, newPassword) => api.post('/Auth/reset-password', { email, token, newPassword }),
};

export const subscriptionService = {
  getPlans: () => api.get('/Subscription/plans'),
  createCheckoutSession: (planId) => api.post('/Subscription/create-checkout-session', { planId }),
  getUsageSummary: () => api.get('/Subscription/usage'),
  stopSession: (sessionId, tokensUsed = 0, transcript = []) => api.post(`/Subscription/session/${sessionId}/stop`, { tokensUsed, transcript }),
  recordUsage: (featureCode, usedAmount, referenceId = "") =>
    api.post('/Subscription/usage/record', {
      featureCode,
      usedAmount,
      referenceId
    }),
};

export const resumeService = {
  getResume: () => api.get('/resume'),
  getAllResumes: () => api.get('/resume/all'), // New
  parseResume: (rawTextDescription) => api.post('/resume/builder/parse', { rawData: rawTextDescription }),
  saveResume: (data) => api.post('/resume', data),
  activateResume: (id) => api.put(`/resume/${id}/activate`), // New
  deleteResume: (id) => api.delete(`/resume/${id}`), // New (Hard Delete)
  softDeleteResume: () => api.delete('/resume') // Existing soft delete
};

export const analyticsService = {
  getSessionAnalytics: (sessionId) => api.get(`/Analytics/session/${sessionId}`),
  // NEW: Fetch history
  getSessionHistory: () => api.get('/Analytics/history'),
};

export const securityService = {
  getSslStatus: () => api.get('/Security/ssl-status'),
};

export default api;