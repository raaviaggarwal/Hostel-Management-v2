import { createContext, useContext } from 'react'

export const TOKEN_KEY = 'token'
export const EXPIRY_KEY = 'sessionExpiry'
export const SIDEBAR_KEY = 'sidebarState'
export const USER_KEY = 'user'
export const SESSION_DURATION = 24 * 60 * 60 * 1000

export const AuthContext = createContext(null)

export function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
