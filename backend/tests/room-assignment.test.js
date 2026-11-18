import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { signToken } from '../src/auth.js'

const admin = { id: 1, role: 'admin', tokenVersion: 0 }
const student = {
  id: 20,
  regNo: 'STU-20',
  name: 'Student',
  gender: 'male',
  year: 1,
  roomId: null,
  hostelId: null,
}
const destination = {
  id: 7,
  roomNo: 'A-101',
  hostelId: 2,
  blockId: 4,
  seater: 2,
  status: 'partially_occupied',
  medicalReserved: false,
}

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    student: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    allocation: { findFirst: vi.fn() },
    room: { update: vi.fn() },
    user: { updateMany: vi.fn() },
  }
  return {
    txMock: tx,
    prismaMock: {
      user: { findUnique: vi.fn() },
      student: { findUnique: vi.fn() },
      room: { findUnique: vi.fn(), findFirst: vi.fn() },
      block: { findUnique: vi.fn() },
      hostel: { findMany: vi.fn() },
      $transaction: vi.fn((callback) => callback(tx)),
    },
  }
})

vi.mock('../src/prisma.js', () => ({ prisma: prismaMock }))

const { createApp } = await import('../src/app.js')
const app = createApp()
const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` })

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.user.findUnique.mockResolvedValue(admin)
  prismaMock.student.findUnique.mockResolvedValue(student)
  prismaMock.room.findUnique.mockResolvedValue(destination)
  prismaMock.block.findUnique.mockResolvedValue({ id: 4, hostelId: 2 })
  prismaMock.hostel.findMany.mockResolvedValue([
    { id: 2, gender: 'male', type: 'freshers' },
  ])
  prismaMock.$transaction.mockImplementation((callback) => callback(txMock))
  txMock.$queryRaw.mockResolvedValue([destination])
  txMock.student.findUnique.mockResolvedValue(student)
  txMock.student.count.mockResolvedValue(2)
  txMock.allocation.findFirst.mockResolvedValue(null)
})

describe('PUT /api/students/:id/room', () => {
  it('rejects a full room without changing Student or Room records', async () => {
    const response = await request(app)
      .put('/api/students/20/room')
      .set(auth(admin))
      .send({ roomId: destination.id })

    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/capacity/i)
    expect(txMock.student.update).not.toHaveBeenCalled()
    expect(txMock.room.update).not.toHaveBeenCalled()
  })

  it('requires the allocation workflow when the Student has an active application', async () => {
    txMock.allocation.findFirst.mockResolvedValueOnce({ id: 33, status: 'approved' })

    const response = await request(app)
      .put('/api/students/20/room')
      .set(auth(admin))
      .send({ roomId: destination.id })

    expect(response.status).toBe(409)
    expect(response.body.message).toMatch(/allocation workflow/i)
    expect(txMock.student.update).not.toHaveBeenCalled()
    expect(txMock.room.update).not.toHaveBeenCalled()
  })
})
