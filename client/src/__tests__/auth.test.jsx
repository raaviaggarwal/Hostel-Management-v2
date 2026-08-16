import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import {
  AuthProvider,
} from '../context/AuthContext'
import {
  useAuth,
  TOKEN_KEY,
  EXPIRY_KEY,
  USER_KEY,
  SIDEBAR_KEY,
  SESSION_DURATION,
} from '../context/auth'

function Probe() {
  const { isAuthenticated, user, login, logout, toggleSidebar, sidebarOpen } = useAuth()
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="role">{user ? user.role : 'none'}</span>
      <span data-testid="sidebar">{String(sidebarOpen)}</span>
      <button onClick={() => login('token-1', { id: 1, name: 'Admin', role: 'admin' })}>
        login
      </button>
      <button onClick={logout}>logout</button>
      <button onClick={toggleSidebar}>toggle</button>
    </div>
  )
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts unauthenticated', () => {
    renderProbe()
    expect(screen.getByTestId('authed')).toHaveTextContent('false')
    expect(screen.getByTestId('role')).toHaveTextContent('none')
  })

  it('restores session from localStorage on mount', () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 9, name: 'Stu', role: 'student' }))
    localStorage.setItem(TOKEN_KEY, 'token-x')
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + 100000))
    renderProbe()
    expect(screen.getByTestId('authed')).toHaveTextContent('true')
    expect(screen.getByTestId('role')).toHaveTextContent('student')
  })

  it('login writes token, sessionExpiry and user to localStorage', () => {
    renderProbe()
    fireEvent.click(screen.getByText('login'))
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-1')
    expect(Number(localStorage.getItem(EXPIRY_KEY))).toBeCloseTo(
      Date.now() + SESSION_DURATION,
      -4
    )
    expect(JSON.parse(localStorage.getItem(USER_KEY)).role).toBe('admin')
    expect(screen.getByTestId('authed')).toHaveTextContent('true')
  })

  it('logout clears session', () => {
    renderProbe()
    fireEvent.click(screen.getByText('login'))
    fireEvent.click(screen.getByText('logout'))
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(screen.getByTestId('authed')).toHaveTextContent('false')
  })

  it('toggleSidebar flips and persists state', () => {
    renderProbe()
    expect(screen.getByTestId('sidebar')).toHaveTextContent('true')
    fireEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('sidebar')).toHaveTextContent('false')
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('false')
  })

  it('clears session when expiry has passed', () => {
    localStorage.setItem(TOKEN_KEY, 'token-expired')
    localStorage.setItem(EXPIRY_KEY, String(Date.now() - 1000))
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, role: 'admin' }))
    renderProbe()
    expect(screen.getByTestId('authed')).toHaveTextContent('false')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('beforeunload + load keeps session (refresh preserves login)', () => {
    vi.useFakeTimers()
    localStorage.setItem(TOKEN_KEY, 'token-keep')
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + 100000))
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, role: 'admin' }))
    renderProbe()

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
      window.dispatchEvent(new Event('load'))
    })
    vi.advanceTimersByTime(200)

    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-keep')
    expect(screen.getByTestId('authed')).toHaveTextContent('true')
  })

  it('beforeunload timer clears session when it fires (actual close)', () => {
    vi.useFakeTimers()
    localStorage.setItem(TOKEN_KEY, 'token-close')
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + 100000))
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, role: 'admin' }))
    renderProbe()

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})
