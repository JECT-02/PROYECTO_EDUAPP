import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
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
import RoadmapDesigner from './pages/RoadmapDesigner'
import Review from './pages/Review'
import ContentReview from './pages/ContentReview'
import ParentDashboard from './pages/ParentDashboard'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading, user, checkOnboardingComplete } = useAuth()
  const location = useLocation()

  if (loading) {
    return <RouteFallback />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role === null) {
    return <RouteFallback />
  }

  if (!checkOnboardingComplete(user)) {
    return <Navigate to="/onboarding/accessibility" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const redirectMap = { teacher: '/teacher', student: '/dashboard', parent: '/parent' }
    return <Navigate to={redirectMap[role] || '/dashboard'} replace />
  }

  return children
}

/**
 * Focus management: after each route change, move focus to #main-content
 * so keyboard/screen-reader users start from the content.
 */
function FocusManager() {
  const location = useLocation()

  useEffect(() => {
    const el = document.getElementById('main-content')
    if (el) {
      el.setAttribute('tabindex', '-1')
      el.focus({ preventScroll: true })
      // Remove tabindex after focus so it doesn't appear in tab order
      setTimeout(() => el.removeAttribute('tabindex'), 100)
    }
  }, [location.pathname])

  return null
}

function PublicRoute({ children }) {
  const { isAuthenticated, role, loading, user, checkOnboardingComplete } = useAuth()

  if (loading) {
    return <RouteFallback />
  }

  if (isAuthenticated) {
    if (role === null) {
      return <RouteFallback />
    }
    if (!checkOnboardingComplete(user)) {
      return <Navigate to="/onboarding/accessibility" replace />
    }
    const redirectMap = { teacher: '/teacher', student: '/dashboard', parent: '/parent' }
    return <Navigate to={redirectMap[role] || '/dashboard'} replace />
  }

  return children
}

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
      }}
    >
      <div className="spinner" />
    </div>
  )
}

export default function App() {
  const [reducedMotion, setReducedMotion] = useState(
    () => document.body.classList.contains('reduce-motion')
  )

  // Watch body class changes for reduce-motion toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setReducedMotion(document.body.classList.contains('reduce-motion'))
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <HashRouter>
      {/* Skip link: first focusable element on every page */}
      {/* Using onClick + preventDefault to avoid HashRouter intercepting the hash */}
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          const el = document.getElementById('main-content')
          if (el) {
            el.setAttribute('tabindex', '-1')
            el.focus()
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            setTimeout(() => el.removeAttribute('tabindex'), 100)
          }
        }}
      >
        Saltar al contenido principal
      </a>

      <StarsBackground />
      <FocusManager />
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/onboarding/accessibility" element={<OnboardingAccess />} />
          <Route path="/onboarding/avatar" element={<OnboardingAvatar />} />

          {/* Teacher routes */}
          <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/courses/:courseId/review" element={<ProtectedRoute allowedRoles={['teacher']}><ContentReview /></ProtectedRoute>} />
          <Route path="/teacher/review" element={<ProtectedRoute allowedRoles={['teacher']}><ContentReview /></ProtectedRoute>} />
          <Route path="/teacher/design/:courseId" element={<ProtectedRoute allowedRoles={['teacher']}><RoadmapDesigner /></ProtectedRoute>} />

          {/* Parent routes */}
          <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />

          {/* Student routes */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute allowedRoles={['student']}><Explore /></ProtectedRoute>} />
          <Route path="/roadmap/:courseId" element={<ProtectedRoute allowedRoles={['student','teacher']}><Roadmap /></ProtectedRoute>} />
          <Route path="/lesson/:courseId/:nodeId" element={<ProtectedRoute allowedRoles={['student','teacher']}><Lesson /></ProtectedRoute>} />
          <Route path="/quiz/:courseId/:nodeId" element={<ProtectedRoute allowedRoles={['student','teacher']}><Quiz /></ProtectedRoute>} />
          <Route path="/quiz/result" element={<ProtectedRoute allowedRoles={['student','teacher']}><QuizResult /></ProtectedRoute>} />
          <Route path="/coliseo" element={<ProtectedRoute allowedRoles={['student','teacher']}><Coliseo /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute allowedRoles={['student']}><Achievements /></ProtectedRoute>} />
          <Route path="/review/:courseId/:nodeId" element={<ProtectedRoute allowedRoles={['student','teacher']}><Review /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute allowedRoles={['student','teacher']}><Review /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['student','teacher','parent']}><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['student','teacher','parent']}><Settings /></ProtectedRoute>} />
        </Routes>
      </AnimatePresence>
      </MotionConfig>
    </HashRouter>
  )
}
