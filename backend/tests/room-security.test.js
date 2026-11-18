import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { signToken } from '../src/auth.js'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    student: { findMany: vi.fn() },
    block: { findUnique: vi.fn() },
    hostel: { findUnique: vi.fn() },
  },
}))

vi.mock('../src/prisma.js', () => ({ prisma: prismaMock }))

const { createApp } = await import('../src/app.js')
const app = createApp()

const admin = { id: 1, role: 'admin', tokenVersion: 0 }
const warden = { id: 2, role: 'warden', tokenVersion: 0, hostelId: 2 }
const student = { id: 3, role: 'student', tokenVersion: 0, regNo: 'STU-3' }
const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` })

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.user.findUnique.mockImplementation(async ({ where }) => (
    [admin, warden, student].find((user) => user.id === where.id) || null
  ))
  prismaMock.user.findFirst.mockResolvedValue(null)
  prismaMock.room.findUnique.mockResolvedValue({ id: 12, status: 'full', medicalReserved: false })
  prismaMock.room.findMany.mockResolvedValue([])
  prismaMock.room.update.mockImplementation(async ({ data }) => ({ id: 12, ...data }))
  prismaMock.student.findMany.mockResolvedValue([])
})

describe('room access controls', () => {
  it('requires an authenticated staff role to list rooms', async () => {
    const response = await request(app).get('/api/rooms')

    expect(response.status).toBe(401)
    expect(prismaMock.room.findMany).not.toHaveBeenCalled()
  })

  it('prevents a warden from overriding their assigned hostel in the room list', async () => {
    const response = await request(app)
      .get('/api/rooms?hostelId=9')
      .set(auth(warden))

    expect(response.status).toBe(403)
    expect(prismaMock.room.findMany).not.toHaveBeenCalled()
  })

  it('allows only an admin to update room status and rejects unknown statuses', async () => {
    const anonymous = await request(app)
      .put('/api/rooms/12/status')
      .send({ status: 'available' })
    const studentResponse = await request(app)
      .put('/api/rooms/12/status')
      .set(auth(student))
      .send({ status: 'available' })
    const invalidStatus = await request(app)
      .put('/api/rooms/12/status')
      .set(auth(admin))
      .send({ status: 'occupied-ish' })

    expect(anonymous.status).toBe(401)
    expect(studentResponse.status).toBe(401)
    expect(invalidStatus.status).toBe(400)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })

  it('clears medical reservation when Admin changes the status to available', async () => {
    const response = await request(app)
      .put('/api/rooms/12/status')
      .set(auth(admin))
      .send({ status: 'available' })

    expect(response.status).toBe(200)
    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { status: 'available', medicalReserved: false },
    })
  })

  it('does not let Warden endpoints update or delete non-Warden users', async () => {
    const updateResponse = await request(app)
      .put('/api/wardens/3')
      .set(auth(admin))
      .send({ name: 'Changed' })
    const deleteResponse = await request(app)
      .delete('/api/wardens/3')
      .set(auth(admin))

    expect(updateResponse.status).toBe(404)
    expect(deleteResponse.status).toBe(404)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled()
  })

  it('rejects a Warden block assigned to a different hostel', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      ...warden,
      name: 'Warden',
      email: 'warden@example.test',
      blockId: 4,
    })
    prismaMock.hostel.findUnique.mockResolvedValueOnce({ id: 2 })
    prismaMock.block.findUnique.mockResolvedValueOnce({ id: 7, hostelId: 9 })

    const response = await request(app)
      .put('/api/wardens/2')
      .set(auth(admin))
      .send({ hostelId: 2, blockId: 7 })

    expect(response.status).toBe(400)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})
