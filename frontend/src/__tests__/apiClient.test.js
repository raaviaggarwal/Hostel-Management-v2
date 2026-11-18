import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import { TOKEN_KEY, useAuth } from '../context/auth'

function LoginProbe() {
  const { login } = useAuth()
  return createElement(
    'button',
    { onClick: () => login('current-jwt', { id: 2, role: 'warden' }) },
    'Set session'
  )
}

describe('apiFetch authentication', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the JWT stored by AuthProvider login on protected requests', async () => {
    render(createElement(AuthProvider, null, createElement(LoginProbe)))
    fireEvent.click(screen.getByRole('button', { name: 'Set session' }))

    await apiFetch('/notifications')

    expect(localStorage.getItem(TOKEN_KEY)).toBe('current-jwt')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/notifications$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer current-jwt',
        }),
      })
    )
  })
})
