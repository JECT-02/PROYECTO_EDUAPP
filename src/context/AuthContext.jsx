import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const ROLE_ROUTES = {
  teacher: { allowed: ['/teacher'], redirect: '/teacher', label: 'Docente' },
  student: { allowed: ['/dashboard','/explore','/roadmap','/lesson','/quiz','/coliseo','/achievements','/review','/profile','/settings'], redirect: '/dashboard', label: 'Estudiante' },
  parent: { allowed: ['/parent'], redirect: '/parent', label: 'Padre' },
}

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/onboarding/accessibility', '/onboarding/avatar']

function getStudentRegistry() {
  try {
    const data = localStorage.getItem('eduapp_students')
    return data ? JSON.parse(data) : {}
  } catch { return {} }
}

function saveStudentRegistry(registry) {
  localStorage.setItem('eduapp_students', JSON.stringify(registry))
}

function getParentLinks() {
  try {
    const data = localStorage.getItem('eduapp_parent_links')
    return data ? JSON.parse(data) : {}
  } catch { return {} }
}

function saveParentLinks(links) {
  localStorage.setItem('eduapp_parent_links', JSON.stringify(links))
}

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

  function login(email, role, name, dni) {
    let studentId = null
    if (role === 'student') {
      const registry = getStudentRegistry()
      if (dni) {
        // Registration: use DNI as student ID
        studentId = dni
        if (!registry[studentId]) {
          registry[studentId] = {
            id: studentId,
            name: name || getDefaultName(email, role),
            email,
            registeredAt: new Date().toISOString(),
          }
          saveStudentRegistry(registry)
        }
      } else {
        // Login: find existing student by email to load their DNI
        const found = Object.entries(registry).find(([, s]) => s.email === email)
        if (found) studentId = found[0]
      }
    }

    const newUser = {
      email,
      role,
      name: name || getDefaultName(email, role),
      avatar: getDefaultAvatar(role),
      isAuthenticated: true,
      ...(role === 'student' && { studentId }),
      ...(role === 'parent' && { linkedStudents: getParentLinks()[email] || [] }),
    }
    setUser(newUser)
    return newUser
  }

  const linkStudent = useCallback((studentId) => {
    if (!user || user.role !== 'parent') return { success: false, error: 'Solo los padres pueden vincular estudiantes.' }

    const registry = getStudentRegistry()
    const student = registry[studentId]
    if (!student) return { success: false, error: 'No se encontró un estudiante con ese DNI. Verifica e intenta de nuevo.' }

    const links = getParentLinks()
    const parentLinks = links[user.email] || []

    if (parentLinks.some(s => s.id === studentId)) {
      return { success: false, error: `El estudiante "${student.name}" ya está vinculado a tu cuenta.` }
    }

    const updatedLinks = [...parentLinks, { id: studentId, name: student.name, linkedAt: new Date().toISOString() }]
    links[user.email] = updatedLinks
    saveParentLinks(links)

    // Update current user state
    setUser(prev => ({ ...prev, linkedStudents: updatedLinks }))

    return { success: true, student }
  }, [user])

  const unlinkStudent = useCallback((studentId) => {
    if (!user || user.role !== 'parent') return

    const links = getParentLinks()
    const parentLinks = links[user.email] || []
    links[user.email] = parentLinks.filter(s => s.id !== studentId)
    saveParentLinks(links)

    setUser(prev => ({
      ...prev,
      linkedStudents: links[user.email],
    }))
  }, [user])

  function logout() {
    setUser(null)
  }

  const isAuthenticated = !!user
  const role = user?.role || null

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated, login, logout, linkStudent, unlinkStudent, ROLE_ROUTES, PUBLIC_ROUTES }}>
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
