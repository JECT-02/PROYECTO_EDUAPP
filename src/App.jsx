import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import StarsBackground from './components/StarsBackground'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import OnboardingAccess from './pages/OnboardingAccess'
import OnboardingAvatar from './pages/OnboardingAvatar'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import Roadmap from './pages/Roadmap'
import Lesson from './pages/Lesson'
import Quiz from './pages/Quiz'
import QuizResult from './pages/QuizResult'
import Coliseo from './pages/Coliseo'
import Achievements from './pages/Achievements'
import TeacherDashboard from './pages/TeacherDashboard'
import Review from './pages/Review'
import ParentDashboard from './pages/ParentDashboard'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

export default function App() {
  return (
    <HashRouter>
      <StarsBackground />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboarding/accessibility" element={<OnboardingAccess />} />
          <Route path="/onboarding/avatar" element={<OnboardingAvatar />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/roadmap/:courseId" element={<Roadmap />} />
          <Route path="/lesson/:courseId/:nodeId" element={<Lesson />} />
          <Route path="/quiz/:courseId/:nodeId" element={<Quiz />} />
          <Route path="/quiz/result" element={<QuizResult />} />
          <Route path="/coliseo" element={<Coliseo />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/review" element={<Review />} />
          <Route path="/parent" element={<ParentDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AnimatePresence>
    </HashRouter>
  )
}
