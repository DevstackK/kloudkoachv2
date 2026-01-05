import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; // Ensure useAuth is exported
import { ExamSetupProvider } from './context/ExamSetupContext';
import { InterviewSetupProvider } from './context/InterviewSetupContext';
import { ColorModeContext } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/LandingPage/LandingPage'; // Import Landing Page
import PaymentPage from './pages/PaymentPage'; // Import PaymentPage
import HomePage from './pages/Home/HomePage';
import LiveInterviewPage from './pages/LiveInterview/LiveInterviewPage';
import InterviewPreparationPage from './pages/InterviewPrep/InterviewPreparationPage';
import ExamPreparationPage from './pages/ExamPrep/ExamPreparationPage';
import FeatureRoute from './components/common/FeatureRoute';
import MainLayout from './layouts/MainLayout';
import UpgradePlanPage from './pages/UpgradePlan/UpgradePlanPage'; // Import the new page
import SessionHistory from './components/dashboard/SessionHistory';
import SessionAnalytics from './components/dashboard/SessionAnalytics';
import UserProfile from './pages/Profile/UserProfile';
import TermsPage from './pages/Legal/TermsPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'; // Import

function AppRoutes() {
  const { user } = useAuth(); // Get user status to handle redirects
  const { toggleColorMode } = useContext(ColorModeContext);

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} 
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Protected Routes - Now under /dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout onToggleTheme={toggleColorMode} />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="analytics/:sessionId" element={<SessionAnalytics />} />
        <Route 
          path="interview" 
          element={
            <FeatureRoute featureCode="LIVE_INTERVIEW">
              <LiveInterviewPage />
            </FeatureRoute>
          } 
        />
        
        <Route 
          path="interview-preparation" 
          element={
            <FeatureRoute featureCode="INTERVIEW_PREP">
              <InterviewPreparationPage />
            </FeatureRoute>
          } 
        />
        
        <Route 
          path="exam-preparation" 
          element={
            <FeatureRoute featureCode="EXAM_PREP">
              <ExamPreparationPage />
            </FeatureRoute>
          } 
        />
        <Route path="history" element={<SessionHistory />} />
        <Route path="upgrade" element={<UpgradePlanPage />} />
        <Route path="profile" element={<UserProfile />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const { toggleColorMode } = useContext(ColorModeContext);

  return (
    <AuthProvider>
      <InterviewSetupProvider>
        <ExamSetupProvider>
          <Router>
             <AppRoutes />
          </Router>
        </ExamSetupProvider>
      </InterviewSetupProvider>
    </AuthProvider>
  );
}

export default App;