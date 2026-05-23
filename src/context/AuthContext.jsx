import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const ROLE_ROUTES = {
  teacher: { allowed: ['/teacher'], redirect: '/teacher', label: 'Docente' },
  student: { allowed: ['/dashboard','/explore','/roadmap','/lesson','/quiz','/coliseo','/achievements','/review','/profile','/settings'], redirect: '/dashboard', label: 'Estudiante' },
  parent: { allowed: ['/parent'], redirect: '/parent', label: 'Padre' },
}

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/onboarding/accessibility', '/onboarding/avatar']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('eduapp_auth')
    if (saved) {
      try { return JSON.parse(saved) } catch { return null }
    }
    return null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('eduapp_auth', JSON.stringify(user))
    } else {
      localStorage.removeItem('eduapp_auth')
    }
  }, [user])

  function login(email, role, name) {
    const newUser = {
      email,
      role,
      name: name || getDefaultName(email, role),
      avatar: getDefaultAvatar(role),
      isAuthenticated: true,
    }
    setUser(newUser)
    return newUser
  }

  function logout() {
    setUser(null)
  }

  const isAuthenticated = !!user
  const role = user?.role || null

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated, login, logout, ROLE_ROUTES, PUBLIC_ROUTES }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function getDefaultName(email, role) {
  const prefix = role === 'teacher' ? 'Prof. ' : role === 'parent' ? 'Fam. ' : ''
  const localPart = email?.split('@')[0] || 'Usuario'
  return prefix + localPart.charAt(0).toUpperCase() + localPart.slice(1)
}

function getDefaultAvatar(role) {
  const avatars = { teacher: '👩‍🏫', student: '🦊', parent: '👨‍👩‍👧' }
  return avatars[role] || '🦊'
}
