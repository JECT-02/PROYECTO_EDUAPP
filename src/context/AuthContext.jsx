import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  getProfile,
  listLinkedStudentsForParent,
  requestParentLink,
  unlinkStudent as apiUnlinkStudent,
} from '../lib/api'
import { registerUserSimulated } from '../lib/llm'

const AuthContext = createContext(null)

const ROLE_ROUTES = {
  teacher: { allowed: ['/teacher', '/profile', '/settings'], redirect: '/teacher', label: 'Docente' },
  student: {
    allowed: ['/dashboard', '/explore', '/roadmap', '/lesson', '/quiz', '/coliseo', '/achievements', '/review', '/profile', '/settings'],
    redirect: '/dashboard',
    label: 'Estudiante',
  },
  parent: { allowed: ['/parent', '/profile', '/settings'], redirect: '/parent', label: 'Padre' },
}

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/onboarding/accessibility', '/onboarding/avatar']

const DEFAULT_AVATAR = { teacher: '👩‍🏫', student: '🦊', parent: '👨‍👩‍👧' }

function getInitialName(email, role) {
  const prefix = role === 'teacher' ? 'Prof. ' : role === 'parent' ? 'Fam. ' : ''
  const local = (email || '').split('@')[0] || 'Usuario'
  return prefix + local.charAt(0).toUpperCase() + local.slice(1)
}

function profileToUser(profile, email) {
  if (!profile) return null
  return {
    id: profile.id,
    email: profile.email || email,
    role: profile.role,
    name: profile.full_name || getInitialName(email, profile.role),
    avatar: DEFAULT_AVATAR[profile.role] || '🦊',
    isAuthenticated: true,
    fullProfile: profile,
  }
}

function isOnboardingCompleteLocal(role) {
  try {
    const prefs = JSON.parse(localStorage.getItem('eduapp_prefs') || '{}')
    return !!prefs[`onboardingCompleted_${role}`]
  } catch { return false }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [linkedStudents, setLinkedStudents] = useState([])
  const hydratingRef = useRef(0)

  const refreshLinked = useCallback(async (parentId) => {
    if (!parentId) {
      setLinkedStudents([])
      return
    }
    const { data } = await listLinkedStudentsForParent(parentId)
    const mapped = (data || []).map((row) => ({
      id: row.student_id,
      linkId: row.id,
      name: row.student?.full_name || 'Estudiante',
    }))
    setLinkedStudents(mapped)
  }, [])

  const hydrateFromSession = useCallback(async (session) => {
    const callId = ++hydratingRef.current
    if (!session?.user) {
      if (callId !== hydratingRef.current) return
      setUser(null)
      setLinkedStudents([])
      setLoading(false)
      return
    }
    const { data: profile, error } = await getProfile(session.user.id)
    if (callId !== hydratingRef.current) return
    if (error) {
      console.warn('[auth] No se pudo cargar el perfil:', error.message)
    }
    const u = profileToUser(profile, session.user.email)
    if (u) {
      u.onboardingCompleted = profile?.onboarding_completed || isOnboardingCompleteLocal(u.role)
    }
    setUser(u)
    if (u?.role === 'parent') {
      await refreshLinked(u.id)
    } else {
      setLinkedStudents([])
    }
    setLoading(false)
  }, [refreshLinked])

  useEffect(() => {
    let unsub
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrateFromSession(session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateFromSession(session)
    })
    unsub = sub?.subscription
    return () => {
      try {
        unsub?.unsubscribe()
      } catch {
        // ignore
      }
    }
  }, [hydrateFromSession])

  async function login({ email, password, magicLink = false }) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado. Completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.')
    }
    if (magicLink) {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      return { magicSent: true }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await hydrateFromSession(data.session)
    const u = profileToUser((await getProfile(data.user?.id)).data, data.user?.email)
    return { user: u }
  }

  async function register({ email, password, fullName, role, ageBand, institution, subject, relation, dni, accessibility, avatar_id, pet_type, pet_name }) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.')
    }
    let result
    try {
      result = await registerUserSimulated({
        email, password, fullName, role, ageBand, institution, subject, relation, dni,
        accessibility, avatar_id, pet_type, pet_name,
      })
    } catch (e) {
      throw new Error(e?.message || 'No se pudo crear la cuenta.')
    }
    if (result?.error) throw new Error(result.error)
    return { needsConfirmation: result?.needsConfirmation ?? false }
  }

  async function resetPassword(email) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.')
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    })
    if (error) throw error
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setLinkedStudents([])
    document.body.classList.remove('high-contrast', 'reduce-motion', 'colorblind', 'large-text')
    document.documentElement.style.fontSize = ''
  }

  const linkStudentByEmail = useCallback(
    async (studentEmail) => {
      if (!user || user.role !== 'parent') {
        return { success: false, error: 'Solo los padres pueden vincular estudiantes.' }
      }
      const { data, error } = await requestParentLink({ parentId: user.id, studentEmail })
      if (error) return { success: false, error: error.message }
      await refreshLinked(user.id)
      return { success: true, student: { id: data.student_id, name: studentEmail } }
    },
    [user, refreshLinked]
  )

  const unlinkStudent = useCallback(
    async (linkIdOrStudentId) => {
      if (!user || user.role !== 'parent') return
      const target = linkedStudents.find((s) => s.id === linkIdOrStudentId || s.linkId === linkIdOrStudentId)
      if (target?.linkId) {
        await apiUnlinkStudent(target.linkId)
        await refreshLinked(user.id)
      }
    },
    [user, linkedStudents, refreshLinked]
  )

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    const { data } = await getProfile(user.id)
    if (data) {
      setUser((prev) => (prev ? {
        ...prev,
        fullProfile: data,
        name: data.full_name || prev.name,
        avatar: DEFAULT_AVATAR[data.role] || prev.avatar,
        onboardingCompleted: data.onboarding_completed || isOnboardingCompleteLocal(data.role),
      } : prev))
    }
  }, [user])

  const updateProfileData = useCallback(async (updates) => {
    if (!user?.id) return { error: new Error('No hay sesión') }
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
    if (!error && data) {
      setUser((prev) => (prev ? {
        ...prev,
        fullProfile: data,
        name: data.full_name || prev.name,
        avatar: DEFAULT_AVATAR[data.role] || prev.avatar,
        onboardingCompleted: data.onboarding_completed || prev.onboardingCompleted,
      } : prev))
    }
    return { data, error }
  }, [user])

  const isAuthenticated = !!user
  const role = user?.role || null
  const studentId = user?.fullProfile?.id || user?.id || null

  const checkOnboardingComplete = useCallback((u) => {
    if (!u) return false
    return u.onboardingCompleted || u.fullProfile?.onboarding_completed || isOnboardingCompleteLocal(u.role)
  }, [])

  const value = {
    user,
    role,
    isAuthenticated,
    loading,
    studentId,
    linkedStudents,
    login,
    register,
    resetPassword,
    logout,
    linkStudent: linkStudentByEmail,
    unlinkStudent,
    refreshProfile,
    updateProfile: updateProfileData,
    checkOnboardingComplete,
    ROLE_ROUTES,
    PUBLIC_ROUTES,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
