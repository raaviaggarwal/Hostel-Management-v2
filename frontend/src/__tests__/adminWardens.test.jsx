import { App } from 'antd'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../api/client', () => ({
  resourceApi: {
    get,
    post: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

const { default: Wardens } = await import('../pages/admin/Wardens')

describe('Admin Wardens page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    get.mockImplementation((path) => {
      if (path === '/wardens') {
        return Promise.resolve({
          items: [
            {
              id: 101,
              name: 'ruby jha',
              username: 'warden_test_user',
              email: 'ruby123@gmail.com',
              role: 'warden',
              hostelId: 4,
              blockId: 6,
              mustChangePassword: true,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        })
      }
      if (path === '/hostels') {
        return Promise.resolve([{ id: 4, name: 'Geeta Bhawan Junior Wing' }])
      }
      if (path === '/blocks') {
        return Promise.resolve([{ id: 6, hostelId: 4, name: 'Junior Wing' }])
      }
      throw new Error(`Unexpected resource path: ${path}`)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the paginated warden and resolves its hostel and block labels', async () => {
    render(
      <App>
        <Wardens />
      </App>
    )

    expect(await screen.findByText('ruby jha')).toBeInTheDocument()
    expect(screen.getByText('ruby123@gmail.com')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Geeta Bhawan Junior Wing')).toBeInTheDocument()
      expect(screen.getByText('Junior Wing')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
  })
})
