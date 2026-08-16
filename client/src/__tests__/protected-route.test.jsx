import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ProtectedRoute from '../routes/ProtectedRoute'
import { TOKEN_KEY, EXPIRY_KEY, USER_KEY } from '../context/auth'

function Harness({ initialEntry }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/warden/dashboard" element={<div>warden-home</div>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
            <Route path="dashboard" element={<div>admin-dashboard</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

function seedSession(role) {
  localStorage.setItem(TOKEN_KEY, `token-${role}`)
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + 100000))
  localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, name: 'Someone', role }))
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear())

  it('redirects unauthenticated users to /login', () => {
    render(<Harness initialEntry="/admin/dashboard" />)
    expect(screen.getByText('login-page')).toBeInTheDocument()
  })

  it('allows access when role matches', () => {
    seedSession('admin')
    render(<Harness initialEntry="/admin/dashboard" />)
    expect(screen.getByText('admin-dashboard')).toBeInTheDocument()
  })

  it('redirects to the user home when role does not match', () => {
    seedSession('warden')
    render(<Harness initialEntry="/admin/dashboard" />)
    expect(screen.getByText('warden-home')).toBeInTheDocument()
  })
})
