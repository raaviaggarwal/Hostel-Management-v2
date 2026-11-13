import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
    notification: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock('../src/prisma.js', () => ({ prisma: prismaMock }))

const { createApp } = await import('../src/app.js')
const { SECRET, JWT_ISSUER, JWT_AUDIENCE, signToken } = await import('../src/auth.js')
const app = createApp()

const users = [
  { id: 1, role: 'admin', tokenVersion: 0 },
  { id: 2, role: 'warden', hostelId: 7, tokenVersion: 0 },
  { id: 3, role: 'student', regNo: 'STU-3', tokenVersion: 0 },
]

const tokenFor = (user) => `Bearer ${signToken(user)}`
const scopeFor = {
  admin: undefined,
  warden: {
    OR: [
      { audience: 'all' },
      { audience: 'wardens' },
      { audience: 'hostel:7' },
      { userId: 2 },
    ],
  },
  student: {
    OR: [{ audience: 'all' }, { audience: 'students' }, { userId: 3 }],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.user.findUnique.mockImplementation(({ where }) =>
    users.find((user) => user.id === where.id) || null
  )
  prismaMock.notification.findMany.mockResolvedValue([])
  prismaMock.notification.updateMany.mockResolvedValue({ count: 1 })
})

describe('notification authorization', () => {
  it.each(users)('lists notifications for the $role role within its scope', async (user) => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', tokenFor(user))

    expect(response.status).toBe(200)
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
      where: scopeFor[user.role],
    })
  })

  it.each(users)('marks notifications as read only within the $role scope', async (user) => {
    const headers = { Authorization: tokenFor(user) }

    const readAll = await request(app).post('/api/notifications/read-all').set(headers)
    const readOne = await request(app).post('/api/notifications/17/read').set(headers)
    const scope = scopeFor[user.role]

    expect(readAll.status).toBe(200)
    expect(readOne.status).toBe(200)
    expect(prismaMock.notification.updateMany).toHaveBeenNthCalledWith(1, {
      where: scope || {},
      data: { read: true },
    })
    expect(prismaMock.notification.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 17, ...(scope ? { OR: scope.OR } : {}) },
      data: { read: true },
    })
  })

  it('returns 401 for missing, invalid, and expired JWTs', async () => {
    const expiredToken = jwt.sign(
      { sub: 2, role: 'warden', ver: 0 },
      SECRET,
      {
        expiresIn: -1,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }
    )

    const missing = await request(app).get('/api/notifications')
    const invalid = await request(app)
      .get('/api/notifications')
      .set('Authorization', 'Bearer invalid-token')
    const expired = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(missing.status).toBe(401)
    expect(invalid.status).toBe(401)
    expect(expired.status).toBe(401)
    expect(prismaMock.notification.findMany).not.toHaveBeenCalled()
  })
})
