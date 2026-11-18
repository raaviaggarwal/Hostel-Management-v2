import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthContext } from '../context/auth'

const { resourceApi } = vi.hoisted(() => ({
  resourceApi: { get: vi.fn() },
}))

vi.mock('../api/client', () => ({ resourceApi }))

const { NotificationsProvider } = await import('../context/NotificationsContext')
const { useNotifications } = await import('../context/notifications')

function Probe() {
  const { items } = useNotifications()
  return <span data-testid="notification-count">{items.length}</span>
}

function tree(auth) {
  return (
    <AuthContext.Provider value={auth}>
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    </AuthContext.Provider>
  )
}

describe('NotificationsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resourceApi.get.mockResolvedValue([{ id: 1, read: false }])
  })

  it('does not fetch before login and refreshes when authentication becomes available', async () => {
    const { rerender } = render(tree({ isAuthenticated: false, token: null }))
    expect(resourceApi.get).not.toHaveBeenCalled()

    rerender(tree({ isAuthenticated: true, token: 'warden-token' }))

    await waitFor(() => expect(resourceApi.get).toHaveBeenCalledWith('/notifications'))
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1')
  })

  it('clears loaded notifications on logout and does not fetch again', async () => {
    const { rerender } = render(tree({ isAuthenticated: true, token: 'student-token' }))

    await waitFor(() => expect(screen.getByTestId('notification-count')).toHaveTextContent('1'))
    rerender(tree({ isAuthenticated: false, token: null }))

    expect(screen.getByTestId('notification-count')).toHaveTextContent('0')
    expect(resourceApi.get).toHaveBeenCalledTimes(1)
  })

  it('ends an invalid session when the notifications API returns 401', async () => {
    const logout = vi.fn()
    resourceApi.get.mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), { status: 401 }))

    render(tree({ isAuthenticated: true, token: 'expired-token', logout }))

    await waitFor(() => expect(logout).toHaveBeenCalledOnce())
  })
})
