import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import Resume from './pages/Resume'
import JobDetail from './pages/JobDetail'
import Tracker from './pages/Tracker'
import Interview from './pages/Interview'
import InterviewLab from './pages/InterviewLab'
import SkillBuilder from './pages/SkillBuilder'
import CareerInsights from './pages/CareerInsights'
import HowItWorks from './pages/HowItWorks'
import Account from './pages/Account'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/search" element={<Search />} />
              <Route path="/saved-jobs" element={<Resume mode="saved" />} />
              <Route path="/resume" element={<Navigate to="/account#resume" replace />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/interview/:roleId" element={<Interview />} />
              <Route path="/interview-lab" element={<InterviewLab />} />
              <Route path="/skill-builder" element={<SkillBuilder />} />
              <Route path="/insights" element={<CareerInsights />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/account" element={<Account />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
