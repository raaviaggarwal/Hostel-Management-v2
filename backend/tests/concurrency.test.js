import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '../src/prisma.js'
import { seedDatabase } from '../prisma/seed.js'
import { createApp } from '../src/app.js'
import { SECRET, JWT_ISSUER, JWT_AUDIENCE, BCRYPT_ROUNDS } from '../src/auth.js'
import bcrypt from 'bcryptjs'

const app = createApp()

const tokenFor = (role, id) =>
  jwt.sign({ sub: id, role, ver: 0 }, SECRET, {
    expiresIn: '24h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  })
const auth = (role, id) => ({ Authorization: `Bearer ${tokenFor(role, id)}` })
const post = async (url, body, headers) => {
  const res = await request(app)
    .post(url)
    .set('Content-Type', 'application/json')
    .set(headers || {})
    .send(body || {})
  return { status: res.status, body: res.body }
}
const put = async (url, body, headers) => {
  const res = await request(app)
    .put(url)
    .set('Content-Type', 'application/json')
    .set(headers || {})
    .send(body || {})
  return { status: res.status, body: res.body }
}
const get = async (url, headers) => {
  const res = await request(app).get(url).set(headers || {})
  return { status: res.status, body: res.body }
}

const createdRecords = {
  users: [],
  students: [],
  allocations: [],
  rooms: [],
  leaves: [],
}

async function cleanup() {
  if (createdRecords.leaves.length) {
    await prisma.leave.deleteMany({ where: { id: { in: createdRecords.leaves } } })
  }
  if (createdRecords.allocations.length) {
    await prisma.allocation.deleteMany({ where: { id: { in: createdRecords.allocations } } })
  }
  if (createdRecords.students.length) {
    await prisma.student.deleteMany({ where: { id: { in: createdRecords.students } } })
  }
  if (createdRecords.users.length) {
    await prisma.user.deleteMany({ where: { id: { in: createdRecords.users } } })
  }
  if (createdRecords.rooms.length) {
    await prisma.room.deleteMany({ where: { id: { in: createdRecords.rooms } } })
  }
  createdRecords.users = []
  createdRecords.students = []
  createdRecords.allocations = []
  createdRecords.rooms = []
  createdRecords.leaves = []
}

beforeEach(async () => {
  await cleanup()
  await seedDatabase(prisma)
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

describe('Concurrency Safety', () => {
  let warden, admin, student, wardenToken, adminToken, studentToken

  beforeEach(async () => {
    warden = await prisma.user.findUnique({ where: { username: 'warden' } })
    admin = await prisma.user.findUnique({ where: { username: 'admin' } })
    student = await prisma.student.findFirst({ where: { regNo: '231030101' } })
    if (!warden || !admin || !student) {
      throw new Error('Required seed users not found')
    }
    wardenToken = auth('warden', warden.id)
    adminToken = auth('admin', admin.id)
    studentToken = auth('student', student.id)
  })

  describe('Simultaneous Last Bed Allocation', () => {
    it('allows only one allocation when two requests race for the last bed', async () => {
      const room = await prisma.room.findFirst({
        where: { seater: 1, status: 'available', medicalReserved: false, hostelId: warden.hostelId },
        include: { hostel: true, block: true },
      })
      if (!room) {
        console.log('Skipping: No single-seater available room found in warden hostel')
        return
      }

      const currentOccupants = await prisma.student.count({ where: { roomId: room.id } })
      if (currentOccupants > 0) {
        console.log('Skipping: Room already has occupants')
        return
      }

      const s1 = await prisma.student.create({
        data: {
          regNo: `RACE001-${Date.now()}`,
          name: 'Race Student 1',
          gender: room.hostel.gender,
          year: room.hostel.type === 'freshers' ? 1 : 2,
          course: 'CS',
          cgpa: 7.5,
          contactno: '9999999991',
          emailid: 'race1@test.com',
          guardianName: 'G1',
          guardianRelation: 'Father',
          guardianContactno: '8888888881',
          active: false,
        },
      })
      createdRecords.students.push(s1.id)

      const s2 = await prisma.student.create({
        data: {
          regNo: `RACE002-${Date.now()}`,
          name: 'Race Student 2',
          gender: room.hostel.gender,
          year: room.hostel.type === 'freshers' ? 1 : 2,
          course: 'CS',
          cgpa: 7.5,
          contactno: '9999999992',
          emailid: 'race2@test.com',
          guardianName: 'G2',
          guardianRelation: 'Father',
          guardianContactno: '8888888882',
          active: false,
        },
      })
      createdRecords.students.push(s2.id)

      const u1 = await prisma.user.create({
        data: {
          name: s1.name,
          username: s1.regNo,
          email: s1.emailid,
          password: bcrypt.hashSync('password123', BCRYPT_ROUNDS),
          role: 'student',
          regNo: s1.regNo,
          hostelId: room.hostelId,
        },
      })
      createdRecords.users.push(u1.id)

      const u2 = await prisma.user.create({
        data: {
          name: s2.name,
          username: s2.regNo,
          email: s2.emailid,
          password: bcrypt.hashSync('password123', BCRYPT_ROUNDS),
          role: 'student',
          regNo: s2.regNo,
          hostelId: room.hostelId,
        },
      })
      createdRecords.users.push(u2.id)

      const a1 = await prisma.allocation.create({
        data: {
          studentId: s1.id,
          studentName: s1.name,
          regNo: s1.regNo,
          gender: s1.gender,
          year: s1.year,
          hostelPrefs: [room.hostelId],
          status: 'approved',
          appliedDate: new Date().toISOString().slice(0, 10),
          updatedDate: new Date().toISOString().slice(0, 10),
          history: [],
        },
      })
      createdRecords.allocations.push(a1.id)

      const a2 = await prisma.allocation.create({
        data: {
          studentId: s2.id,
          studentName: s2.name,
          regNo: s2.regNo,
          gender: s2.gender,
          year: s2.year,
          hostelPrefs: [room.hostelId],
          status: 'approved',
          appliedDate: new Date().toISOString().slice(0, 10),
          updatedDate: new Date().toISOString().slice(0, 10),
          history: [],
        },
      })
      createdRecords.allocations.push(a2.id)

      const [r1, r2] = await Promise.allSettled([
        post(`/api/allocations/${a1.id}/allocate`, { roomId: room.id }, wardenToken),
        post(`/api/allocations/${a2.id}/allocate`, { roomId: room.id }, wardenToken),
      ])

      const successful = [r1, r2].filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200
      )
      const failed = [r1, r2].filter(
        (r) => r.status === 'fulfilled' && r.value.status === 409
      )

      expect(successful.length).toBe(1)
      expect(failed.length).toBe(1)

      const updatedRoom = await prisma.room.findUnique({ where: { id: room.id } })
      expect(updatedRoom?.status).toBe('full')

      const occupants = await prisma.student.count({ where: { roomId: room.id } })
      expect(occupants).toBe(1)
    })
  })

  describe('Simultaneous Room Transfer', () => {
    it('prevents transfer to a full room and keeps source room occupied', async () => {
      const occupiedRoom = await prisma.room.findFirst({
        where: { status: 'occupied', medicalReserved: false },
        include: { hostel: true, block: true },
      })
      if (!occupiedRoom) {
        console.log('Skipping: No occupied room found')
        return
      }

      const studentInRoom = await prisma.student.findFirst({
        where: { roomId: occupiedRoom.id, active: true },
      })
      if (!studentInRoom) {
        console.log('Skipping: No student in occupied room')
        return
      }

      const allocation = await prisma.allocation.findFirst({
        where: { studentId: studentInRoom.id },
      })
      if (!allocation) {
        console.log('Skipping: No allocation for student')
        return
      }

      const fullRoom = await prisma.room.findFirst({
        where: { status: 'full', medicalReserved: false, hostelId: occupiedRoom.hostelId },
      })
      if (!fullRoom) {
        console.log('Skipping: No full room found in same hostel')
        return
      }

      const result = await post(`/api/allocations/${allocation.id}/transfer`, { roomId: fullRoom.id }, wardenToken)

      expect(result.status).toBe(409)

      const updatedAlloc = await prisma.allocation.findUnique({ where: { id: allocation.id } })
      expect(updatedAlloc?.roomId).toBe(occupiedRoom.id)

      const srcRoom = await prisma.room.findUnique({ where: { id: occupiedRoom.id } })
      expect(srcRoom?.status).toBe('occupied')
    })
  })

  describe('Room Cancellation Consistency', () => {
    it('cancels allocation and frees room when last occupant leaves', async () => {
      const occupiedRoom = await prisma.room.findFirst({
        where: { status: 'occupied', medicalReserved: false },
      })
      if (!occupiedRoom) {
        console.log('Skipping: No occupied room found')
        return
      }

      const studentInRoom = await prisma.student.findFirst({
        where: { roomId: occupiedRoom.id, active: true },
      })
      if (!studentInRoom) return

      const allocation = await prisma.allocation.findFirst({
        where: { studentId: studentInRoom.id },
      })
      if (!allocation) return

      const result = await post(`/api/allocations/${allocation.id}/cancel`, {}, wardenToken)
      expect(result.status).toBe(200)

      const otherOccupants = await prisma.student.count({
        where: { roomId: occupiedRoom.id, id: { not: studentInRoom.id } },
      })
      if (otherOccupants === 0) {
        const updatedRoom = await prisma.room.findUnique({ where: { id: occupiedRoom.id } })
        expect(updatedRoom?.status).toBe('available')
      }

      const updatedStudent = await prisma.student.findUnique({ where: { id: studentInRoom.id } })
      expect(updatedStudent?.roomId).toBeNull()
      expect(updatedStudent?.active).toBe(false)
    })
  })

  describe('Concurrent Attendance Submissions', () => {
    it('handles repeated submissions for same student/date without unique violation', async () => {
      const s = await prisma.student.findFirst({
        where: { hostelId: warden.hostelId },
      })
      if (!s) {
        console.log('Skipping: No student in warden hostel')
        return
      }

      const date = new Date().toISOString().slice(0, 10)
      const payload = {
        date,
        records: [{ studentId: s.id, status: 'present' }],
      }

      const [r1, r2] = await Promise.allSettled([
        put(`/api/warden/attendance/register`, payload, wardenToken),
        put(`/api/warden/attendance/register`, payload, wardenToken),
      ])

      const successful = [r1, r2].filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200
      )
      expect(successful.length).toBe(2)

      const count = await prisma.attendance.count({
        where: { studentId: s.id, date },
      })
      expect(count).toBe(1)
    })

    it('handles concurrent different status submissions for same student/date', async () => {
      const s = await prisma.student.findFirst({
        where: { hostelId: warden.hostelId },
      })
      if (!s) {
        console.log('Skipping: No student in warden hostel')
        return
      }

      const date = new Date().toISOString().slice(0, 10)
      const payload1 = { date, records: [{ studentId: s.id, status: 'present' }] }
      const payload2 = { date, records: [{ studentId: s.id, status: 'absent' }] }

      const [r1, r2] = await Promise.allSettled([
        put(`/api/warden/attendance/register`, payload1, wardenToken),
        put(`/api/warden/attendance/register`, payload2, wardenToken),
      ])

      const successful = [r1, r2].filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200
      )
      expect(successful.length).toBe(2)

      const count = await prisma.attendance.count({
        where: { studentId: s.id, date },
      })
      expect(count).toBe(1)

      const record = await prisma.attendance.findFirst({
        where: { studentId: s.id, date },
      })
      expect(['present', 'absent']).toContain(record?.status)
    })
  })

  describe('Leave Quota and Duplicate Request Scenarios', () => {
    it('allows only one leave when two requests race at quota limit', async () => {
      const s = await prisma.student.findFirst({
        where: { hostelId: warden.hostelId },
      })
      if (!s) return

      const settings = await prisma.setting.findFirst()
      const quota = settings?.leaveTotal || 12

      await prisma.leave.createMany({
        data: Array.from({ length: quota - 1 }, (_, i) => ({
          studentId: s.id,
          studentName: s.name,
          requestType: 'LEAVE',
          from: `2026-01-${String(i + 1).padStart(2, '0')}`,
          to: `2026-01-${String(i + 1).padStart(2, '0')}`,
          reason: `Test ${i}`,
          destination: 'Home',
          parentApproved: true,
          status: 'approved',
        })),
      })

      const studentUser = await prisma.user.findFirst({ where: { regNo: s.regNo } })
      if (!studentUser) return

      const leaveData = {
        requestType: 'LEAVE',
        from: '2026-12-01',
        to: '2026-12-02',
        reason: 'Concurrent test',
        destination: 'Home',
      }

      const [r1, r2] = await Promise.allSettled([
        post('/api/leaves', leaveData, auth('student', studentUser.id)),
        post('/api/leaves', leaveData, auth('student', studentUser.id)),
      ])

      const successful = [r1, r2].filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201
      )
      const failed = [r1, r2].filter(
        (r) => r.status === 'fulfilled' && r.value.status === 400
      )

      expect(successful.length).toBe(1)
      expect(failed.length).toBe(1)
    })

    it('prevents duplicate pending leave for same student', async () => {
      const s = await prisma.student.findFirst({
        where: { hostelId: warden.hostelId },
      })
      if (!s) return

      const studentUser = await prisma.user.findFirst({ where: { regNo: s.regNo } })
      if (!studentUser) return

      const leaveData = {
        requestType: 'LEAVE',
        from: '2026-12-10',
        to: '2026-12-12',
        reason: 'Duplicate test',
        destination: 'Home',
      }

      await post('/api/leaves', leaveData, auth('student', studentUser.id))

      const result = await post('/api/leaves', leaveData, auth('student', studentUser.id))

      expect(result.status).toBe(400)
      expect(result.body.message).toContain('already have a pending')
    })
  })

  describe('Authorization Matrix', () => {
    it('denies admin access to student endpoints', async () => {
      const result = await get('/api/student/leaves', adminToken)
      expect(result.status).toBe(403)
    })

    it('denies student access to warden endpoints', async () => {
      const result = await get('/api/leaves', studentToken)
      expect(result.status).toBe(403)
    })

    it('denies warden access to other hostel students', async () => {
      const otherStudent = await prisma.student.findFirst({
        where: { hostelId: { not: warden.hostelId } },
      })
      if (!otherStudent) return

      const leave = await prisma.leave.create({
        data: {
          studentId: otherStudent.id,
          studentName: otherStudent.name,
          requestType: 'LEAVE',
          from: '2026-12-01',
          to: '2026-12-02',
          reason: 'Test',
          destination: 'Home',
          parentApproved: false,
          status: 'pending',
        },
      })
      createdRecords.leaves.push(leave.id)

      const result = await post(`/api/leaves/${leave.id}/decision`, { status: 'approved' }, wardenToken)
      expect(result.status).toBe(403)
    })

    it('allows admin full access', async () => {
      const s = await prisma.student.findFirst()
      const leave = await prisma.leave.create({
        data: {
          studentId: s.id,
          studentName: s.name,
          requestType: 'LEAVE',
          from: '2026-12-01',
          to: '2026-12-02',
          reason: 'Test',
          destination: 'Home',
          parentApproved: false,
          status: 'pending',
        },
      })
      createdRecords.leaves.push(leave.id)

      const result = await post(`/api/leaves/${leave.id}/decision`, { status: 'approved' }, adminToken)
      expect(result.status).toBe(200)
    })
  })
})