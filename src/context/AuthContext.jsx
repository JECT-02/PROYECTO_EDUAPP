import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const ROLE_ROUTES = {
  teacher: { allowed: ['/teacher','/profile','/settings'], redirect: '/teacher', label: 'Docente' },
  student: { allowed: ['/dashboard','/explore','/roadmap','/lesson','/quiz','/coliseo','/achievements','/review','/profile','/settings'], redirect: '/dashboard', label: 'Estudiante' },
  parent: { allowed: ['/parent','/profile','/settings'], redirect: '/parent', label: 'Padre' },
}

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/onboarding/accessibility', '/onboarding/avatar']

const API_URL = import.meta.env.VITE_API_URL || '/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('eduapp_token')
    const storedUser = localStorage.getItem('eduapp_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error("Parse error", e)
      }
    }
    setLoading(false)
  }, [])

  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const headers = { 'Content-Type': 'application/json' }
    const currentToken = token || localStorage.getItem('eduapp_token')
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }
    
    const config = { method, headers }
    if (body) config.body = JSON.stringify(body)
      
    let res
    try {
      res = await fetch(`${API_URL}${endpoint}`, config)
    } catch (err) {
      throw new Error('No se pudo conectar con el servidor. Asegúrate de que el backend esté funcionando (ejecuta iniciar.bat).')
    }
    if (res.status === 401 && endpoint !== '/auth/login') {
      // Don't logout on 401 from login endpoint
      const errorData = await res.json().catch(() => ({ detail: { message: 'No autorizado' } }))
      throw new Error(errorData.detail?.message || errorData.detail || 'No autorizado')
    }
    return res
  }

  const login = async (email, password, role = "student") => {
    try {
      const res = await apiCall('/auth/login', 'POST', { email, password, role })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.detail?.message || errorData.detail || "Error de inicio de sesión"
        throw new Error(errorMessage)
      }
      const data = await res.json()
      
      const newUser = {
        ...data.user,
        isAuthenticated: true,
        avatar: getDefaultAvatar(data.user.role),
      }
      
      setToken(data.access_token)
      setUser(newUser)
      localStorage.setItem('eduapp_token', data.access_token)
      localStorage.setItem('eduapp_user', JSON.stringify(newUser))
      
      return newUser
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const res = await apiCall('/auth/register', 'POST', userData)
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        const msg = error.detail?.message || error.detail || error.message || "Error al registrar"
        throw new Error(msg)
      }
      return await res.json()
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const verifyOTP = async (email, code) => {
    try {
      const res = await apiCall('/auth/verify', 'POST', { email, code })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.detail?.message || error.detail || 'Código inválido')
      }
      const data = await res.json()
      
      const newUser = { ...data.user, isAuthenticated: true, avatar: getDefaultAvatar(data.user.role) }
      setToken(data.access_token)
      setUser(newUser)
      localStorage.setItem('eduapp_token', data.access_token)
      localStorage.setItem('eduapp_user', JSON.stringify(newUser))
      
      return newUser
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('eduapp_token')
    localStorage.removeItem('eduapp_user')
  }

  const linkStudent = useCallback(async (studentId) => {
    // For MVP parent linking, we just mock the success state since we didn't fully wire up the frontend parent view to the new API yet
    if (!user || user.role !== 'parent') return { success: false }
    const updatedLinks = [...(user.linkedStudents || []), { id: studentId, name: `Estudiante ${studentId}`, linkedAt: new Date().toISOString() }]
    setUser(prev => ({ ...prev, linkedStudents: updatedLinks }))
    return { success: true }
  }, [user])

  const unlinkStudent = useCallback((studentId) => {
    if (!user || user.role !== 'parent') return
    const updatedLinks = (user.linkedStudents || []).filter(s => s.id !== studentId)
    setUser(prev => ({ ...prev, linkedStudents: updatedLinks }))
  }, [user])

  const isAuthenticated = !!user
  const role = user?.role || null

  return (
    <AuthContext.Provider value={{ 
      user, role, isAuthenticated, token, loading,
      login, logout, register, verifyOTP, apiCall,
      linkStudent, unlinkStudent, ROLE_ROUTES, PUBLIC_ROUTES 
    }}>
      {!loading && children}
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
