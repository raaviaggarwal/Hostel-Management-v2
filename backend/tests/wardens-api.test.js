import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { signToken } from '../src/auth.js'

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../src/prisma.js', () => ({ prisma }))

const { createApp } = await import('../src/app.js')
const app = createApp()

const adminToken = signToken({ id: 1, role: 'admin', tokenVersion: 0 })

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/wardens', () => {
  it('requires an authenticated Admin', async () => {
    const response = await request(app).get('/api/wardens')

    expect(response.status).toBe(401)
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('returns paginated safe Warden fields without a password hash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      role: 'admin',
      tokenVersion: 0,
    })
    prisma.user.count.mockResolvedValue(1)
    prisma.user.findMany.mockResolvedValue([
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
    ])

    const response = await request(app)
      .get('/api/wardens')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      items: [{
        id: 101,
        name: 'ruby jha',
        email: 'ruby123@gmail.com',
        hostelId: 4,
        blockId: 6,
      }],
    })
    expect(response.body.items[0]).not.toHaveProperty('password')
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: { in: ['warden', 'chief_warden', 'deputy_warden', 'assistant_warden'] } },
      select: expect.objectContaining({
        id: true,
        name: true,
        email: true,
        hostelId: true,
        blockId: true,
      }),
    }))
    expect(prisma.user.findMany.mock.calls[0][0].select).not.toHaveProperty('password')
  })
})
