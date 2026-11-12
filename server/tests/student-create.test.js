import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { signToken } from '../src/auth.js'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    student: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    notification: { findMany: vi.fn(), updateMany: vi.fn() },
    allocation: { findFirst: vi.fn(), findMany: vi.fn() },
    hostel: { findMany: vi.fn() },
    room: { findUnique: vi.fn(), findMany: vi.fn() },
    complaint: { findMany: vi.fn() },
    leave: { findMany: vi.fn() },
  },
}))

vi.mock('../src/prisma.js', () => ({ prisma: prismaMock }))

const { createApp } = await import('../src/app.js')
const app = createApp()

const admin = { id: 1, role: 'admin', tokenVersion: 0 }
const warden = { id: 2, role: 'warden', tokenVersion: 0, hostelId: 2 }
const hostelLessWarden = { id: 3, role: 'chief_warden', tokenVersion: 0 }
const student = { id: 4, role: 'student', tokenVersion: 0, regNo: 'STU-4' }
const studentPayload = { regNo: 'NEW-REG', name: 'New Student', gender: 'male', course: 'Engineering' }

const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` })

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
    return [admin, warden, hostelLessWarden, student].find((user) => user.id === where.id) || null
  })
  prismaMock.student.create.mockImplementation(async ({ data }) => ({ id: 500, ...data }))
  prismaMock.student.findMany.mockResolvedValue([])
  prismaMock.notification.findMany.mockResolvedValue([])
  prismaMock.allocation.findFirst.mockResolvedValue(null)
  prismaMock.allocation.findMany.mockResolvedValue([])
  prismaMock.hostel.findMany.mockResolvedValue([])
  prismaMock.room.findMany.mockResolvedValue([])
  prismaMock.complaint.findMany.mockResolvedValue([])
  prismaMock.leave.findMany.mockResolvedValue([])
})

describe('POST /api/students', () => {
  it('lets an admin create a student profile', async () => {
    const response = await request(app)
      .post('/api/students')
      .set(auth(admin))
      .send(studentPayload)

    expect(response.status).toBe(201)
    expect(response.body.regNo).toBe(studentPayload.regNo)
    expect(prismaMock.student.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ regNo: studentPayload.regNo, active: false }),
    })
  })

  it('lets a warden create a student only in their assigned hostel', async () => {
    const response = await request(app)
      .post('/api/students')
      .set(auth(warden))
      .send({ ...studentPayload, hostelId: 5 })

    expect(response.status).toBe(201)
    expect(response.body.hostelId).toBe(2)
    expect(prismaMock.student.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ hostelId: 2 }),
    })
  })

  it('rejects student accounts and wardens without a hostel assignment', async () => {
    const studentResponse = await request(app)
      .post('/api/students')
      .set(auth(student))
      .send(studentPayload)
    const wardenResponse = await request(app)
      .post('/api/students')
      .set(auth(hostelLessWarden))
      .send(studentPayload)

    expect(studentResponse.status).toBe(403)
    expect(wardenResponse.status).toBe(403)
    expect(prismaMock.student.create).not.toHaveBeenCalled()
  })

  it('prevents wardens from assigning rooms or managing students outside their hostel', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce({ id: 20, hostelId: 5 })
    const outsideStudent = await request(app)
      .put('/api/students/20/room')
      .set(auth(warden))
      .send({ roomId: 55 })

    prismaMock.student.findUnique.mockResolvedValueOnce({ id: 21, hostelId: 2 })
    prismaMock.room.findUnique.mockResolvedValueOnce({ id: 55, hostelId: 5 })
    const outsideRoom = await request(app)
      .put('/api/students/21/room')
      .set(auth(warden))
      .send({ roomId: 55 })

    expect(outsideStudent.status).toBe(403)
    expect(outsideRoom.status).toBe(403)
  })

  it('rejects missing credentials and duplicate registration numbers', async () => {
    const unauthorized = await request(app).post('/api/students').send(studentPayload)
    prismaMock.student.create.mockRejectedValueOnce({ code: 'P2002' })
    const duplicate = await request(app)
      .post('/api/students')
      .set(auth(admin))
      .send(studentPayload)

    expect(unauthorized.status).toBe(401)
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.message).toMatch(/registration number already exists/i)
  })

  it('requires authentication for student and notification lists', async () => {
    const students = await request(app).get('/api/students')
    const studentById = await request(app).get('/api/students/20')
    const notifications = await request(app).get('/api/notifications')
    const markRead = await request(app).post('/api/notifications/read-all').send({})

    expect(students.status).toBe(401)
    expect(studentById.status).toBe(401)
    expect(notifications.status).toBe(401)
    expect(markRead.status).toBe(401)
    expect(prismaMock.student.findMany).not.toHaveBeenCalled()
    expect(prismaMock.notification.findMany).not.toHaveBeenCalled()
    expect(prismaMock.notification.updateMany).not.toHaveBeenCalled()
  })

  it('limits student detail reads to the requesters authorized scope', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce({ id: 20, regNo: 'OTHER', hostelId: 5 })
    const outsideWardenStudent = await request(app)
      .get('/api/students/20')
      .set(auth(warden))

    prismaMock.student.findUnique.mockResolvedValueOnce({ id: 21, regNo: student.regNo, hostelId: 2 })
    const ownStudent = await request(app)
      .get('/api/students/21')
      .set(auth(student))

    prismaMock.student.findUnique.mockResolvedValueOnce({ id: 22, regNo: 'OTHER', hostelId: 2 })
    const otherStudent = await request(app)
      .get('/api/students/22')
      .set(auth(student))

    expect(outsideWardenStudent.status).toBe(403)
    expect(ownStudent.status).toBe(200)
    expect(otherStudent.status).toBe(403)
  })

  it('scopes student and warden list queries to their own records', async () => {
    await request(app).get('/api/students').set(auth(student))
    expect(prismaMock.student.findMany).toHaveBeenLastCalledWith({
      where: { regNo: student.regNo },
      orderBy: { id: 'asc' },
    })

    await request(app).get('/api/students').set(auth(warden))
    expect(prismaMock.student.findMany).toHaveBeenLastCalledWith({
      where: { hostelId: warden.hostelId },
      orderBy: { id: 'asc' },
    })
  })

  it('requires an admin token for the admin dashboard', async () => {
    const dashboard = await request(app).get('/api/admin/dashboard').set(auth(admin))
    const anonymous = await request(app).get('/api/admin/dashboard')
    const studentDashboard = await request(app).get('/api/admin/dashboard').set(auth(student))

    expect(dashboard.status).toBe(200)
    expect(anonymous.status).toBe(401)
    expect(studentDashboard.status).toBe(403)
  })

  it('returns server errors instead of treating database outages as invalid tokens', async () => {
    const databaseError = new Error('database connection unavailable')
    prismaMock.user.findUnique.mockRejectedValueOnce(databaseError)
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const response = await request(app).get('/api/auth/me').set(auth(admin))
      expect(response.status).toBe(500)
      expect(response.body.message).toBe('Internal server error')
      expect(logError).toHaveBeenCalledWith('Server error:', databaseError.message)
    } finally {
      logError.mockRestore()
    }
  })
})
