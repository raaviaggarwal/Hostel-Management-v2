import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'

const AuthContext = createContext(null)

export const TOKEN_KEY = 'token'
export const EXPIRY_KEY = 'sessionExpiry'
export const SIDEBAR_KEY = 'sidebarState'
export const USER_KEY = 'user'
export const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function isSessionValid() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return false
  const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0)
  if (!expiry) return false
  return Date.now() < expiry
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    isSessionValid() ? localStorage.getItem(TOKEN_KEY) : null
  )
  const [user, setUser] = useState(() => (isSessionValid() ? readUser() : null))
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) !== 'false'
  )
  const closeTimerRef = useRef(null)

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const login = useCallback((newToken, newUser) => {
    const expiry = String(Date.now() + SESSION_DURATION)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(EXPIRY_KEY, expiry)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      const next = !open
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }, [])

  // Session expiry: check once on mount and on a rolling interval.
  useEffect(() => {
    const check = () => {
      if (!isSessionValid()) clearSession()
    }
    check()
    const interval = setInterval(check, 60 * 1000)
    return () => clearInterval(interval)
  }, [clearSession])

  // beforeunload: schedule cleanup 100ms later. On a refresh the new document
  // loads quickly and clears the timer, so the session survives. On an actual
  // close the timer executes and clears the session.
  useEffect(() => {
    const handleBeforeUnload = () => {
      closeTimerRef.current = setTimeout(() => {
        clearSession()
      }, 100)
    }
    const handleLoad = () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('load', handleLoad)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('load', handleLoad)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: !!token && !!user,
      login,
      logout,
      toggleSidebar,
      sidebarOpen,
    }),
    [token, user, login, logout, toggleSidebar, sidebarOpen]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
