import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Profile from "../pages/Profile";
import MockInterview from "../pages/MockInterview";
import FullscreenInterview from "../pages/FullscreenInterview";
import InterviewPrep from "../pages/InterviewPrep";
import ProtectedRoute from "../components/layout/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/mock-interview" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
      <Route path="/fullscreen" element={<ProtectedRoute><FullscreenInterview /></ProtectedRoute>} />
      <Route path="/prep" element={<ProtectedRoute><InterviewPrep /></ProtectedRoute>} />
    </Routes>
  );
}
