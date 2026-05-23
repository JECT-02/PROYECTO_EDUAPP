import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './context/AuthContext'
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

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to the role's home page
    const redirectMap = { teacher: '/teacher', student: '/dashboard', parent: '/parent' }
    return <Navigate to={redirectMap[role] || '/dashboard'} replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, role } = useAuth()

  if (isAuthenticated) {
    const redirectMap = { teacher: '/teacher', student: '/dashboard', parent: '/parent' }
    return <Navigate to={redirectMap[role] || '/dashboard'} replace />
  }

  return children
}

export default function App() {
  return (
    <HashRouter>
      <StarsBackground />
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/onboarding/accessibility" element={<OnboardingAccess />} />
          <Route path="/onboarding/avatar" element={<OnboardingAvatar />} />

          {/* Teacher routes */}
          <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />

          {/* Parent routes */}
          <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />

          {/* Student routes */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute allowedRoles={['student']}><Explore /></ProtectedRoute>} />
          <Route path="/roadmap/:courseId" element={<ProtectedRoute allowedRoles={['student']}><Roadmap /></ProtectedRoute>} />
          <Route path="/lesson/:courseId/:nodeId" element={<ProtectedRoute allowedRoles={['student']}><Lesson /></ProtectedRoute>} />
          <Route path="/quiz/:courseId/:nodeId" element={<ProtectedRoute allowedRoles={['student']}><Quiz /></ProtectedRoute>} />
          <Route path="/quiz/result" element={<ProtectedRoute allowedRoles={['student']}><QuizResult /></ProtectedRoute>} />
          <Route path="/coliseo" element={<ProtectedRoute allowedRoles={['student']}><Coliseo /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute allowedRoles={['student']}><Achievements /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute allowedRoles={['student']}><Review /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['student']}><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['student','teacher','parent']}><Settings /></ProtectedRoute>} />
        </Routes>
      </AnimatePresence>
    </HashRouter>
  )
}
