import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../src/prisma.js'
import { seedDatabase } from '../prisma/seed.js'
import { createApp } from '../src/app.js'
import { SECRET, JWT_ISSUER, JWT_AUDIENCE } from '../src/auth.js'

const app = createApp()

const tokenFor = (role, id) =>
  jwt.sign({ sub: id, role, ver: 0 }, SECRET, {
    expiresIn: '24h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  })
const auth = (role, id) => ({ Authorization: `Bearer ${tokenFor(role, id)}` })
const get = async (url, headers) => {
  const res = await request(app).get(url).set(headers || {})
  return res.body
}
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
const del = async (url, headers) => {
  const res = await request(app).delete(url).set(headers || {})
  return { status: res.status, body: res.body }
}
const byName = async (name) => prisma.student.findFirst({ where: { name } })
const allocByName = async (name) => prisma.allocation.findFirst({ where: { studentName: name } })
const userByUsername = async (username) => prisma.user.findFirst({ where: { username } })

beforeEach(async () => {
  await seedDatabase(prisma)
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('auth', () => {
  it('logs in admin and student with demo credentials', async () => {
    const admin = await post('/api/auth/login', { usernameOrEmail: 'admin', password: 'admin123' })
    expect(admin.status).toBe(200)
    expect(admin.body.user.role).toBe('admin')
    expect(admin.body.token).toBeTruthy()

    const student = await post('/api/auth/login', { usernameOrEmail: 'student', password: 'student123' })
    expect(student.status).toBe(200)
    expect(student.body.user.role).toBe('student')
    expect(student.body.token).toBeTruthy()
  })

  it('rejects invalid credentials', async () => {
    const res = await post('/api/auth/login', { usernameOrEmail: 'student', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('logout invalidates the token server-side', async () => {
    const login = await post('/api/auth/login', { usernameOrEmail: 'student', password: 'student123' })
    const headers = { Authorization: `Bearer ${login.body.token}` }
    const me = await get('/api/auth/me', headers)
    expect(me.user.role).toBe('student')

    const logout = await post('/api/auth/logout', {}, headers)
    expect(logout.status).toBe(200)

    const after = await get('/api/auth/me', headers)
    expect(after.user).toBeUndefined()
    expect(after.message).toBe('Unauthorized')
  })
})

describe('admin dashboard', () => {
  it('returns occupancy grouped by gender across 7 hostels', async () => {
    const admin = await userByUsername('admin')
    const data = await get('/api/admin/dashboard', auth('admin', admin.id))
    expect(data.stats.totalHostels).toBe(7)
    expect(data.stats.campusHostels).toBe(5)
    expect(data.stats.offCampusHostels).toBe(2)
    expect(data.stats.totalCapacity).toBeGreaterThan(0)
    expect(data.stats.occupiedBeds + data.stats.availableBeds).toBe(data.stats.totalCapacity)
    expect(data.hostels).toHaveLength(7)

    const girls = data.hostels.filter((h) => h.gender === 'female')
    const boys = data.hostels.filter((h) => h.gender === 'male')
    expect(girls.length).toBe(2)
    expect(boys.length).toBe(5)
    for (const h of data.hostels) {
      expect(h.occupied + h.available).toBe(h.seats)
      expect(h.occupancyPct).toBeGreaterThanOrEqual(0)
      expect(h.occupancyPct).toBeLessThanOrEqual(100)
      expect(h.rooms).toBeGreaterThan(0)
    }
  })

  it('tracks allocation pipeline on the dashboard', async () => {
    const admin = await userByUsername('admin')
    const data = await get('/api/admin/dashboard', auth('admin', admin.id))
    expect(data.stats.pendingAllocations).toBe(3)
    expect(data.stats.waitlisted).toBe(1)
  })
})

describe('hostels and rooms', () => {
  it('lists hostels with rooms, occupancy and wings', async () => {
    const hostels = await get('/api/hostels')
    expect(hostels).toHaveLength(7)
    const azad = hostels.find((h) => h.code === 'AZ')
    expect(azad.wings).toBe(1)
    expect(azad.rooms).toBe(175)
    expect(azad.seats).toBe(329)
  })

  it('lists rooms with occupancy and special statuses', async () => {
    const rooms = await get('/api/rooms')
    expect(rooms.length).toBeGreaterThan(1000)
    const statuses = new Set(rooms.map((r) => r.status))
    expect(statuses.has('medical_reserved')).toBe(true)
    expect(statuses.has('maintenance')).toBe(true)
    expect(rooms.every((r) => r.occupied >= 0 && r.occupied <= r.seater)).toBe(true)
  })

  it('returns room detail with occupants, wing and inventory', async () => {
    const room = await get('/api/rooms/1')
    expect(room.id).toBe(1)
    expect(room.wing).toBeTruthy()
    expect(room.hostel).toBeTruthy()
    expect(Array.isArray(room.occupants)).toBe(true)
    expect(Array.isArray(room.inventory)).toBe(true)
  })
})

describe('student allocation status', () => {
  it('returns the student allocation with room', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const list = await get('/api/student/allocation', auth('student', raavi.id))
    expect(list.length).toBeGreaterThan(0)
    const current = list[0]
    expect(current.status).toBe('occupied')
    expect(current.roomNo).toBe(raavi.roomno)
  })

  it('surfaces allocation status on the student list', async () => {
    const admin = await userByUsername('admin')
    const students = await get('/api/students', auth('admin', admin.id))
    const raavi = students.find((s) => s.name === 'Raavi Aggarwal')
    expect(raavi.allocationStatus).toBe('occupied')
    const manisha = students.find((s) => s.name === 'Manisha Rao')
    expect(manisha.allocationStatus).toBe('applied')
  })
})

describe('student creation', () => {
  it('lets admins create and persist students, and reports duplicate registration numbers', async () => {
    const regNo = 'TEST-ADMIN-STUDENT-2026'
    const payload = { regNo, name: 'Admin Created Student', gender: 'male', year: 1, course: 'Engineering' }
    const admin = await userByUsername('admin')

    const created = await post('/api/students', payload, auth('admin', admin.id))
    expect(created.status).toBe(201)

    const persisted = await prisma.student.findUnique({ where: { regNo } })
    expect(persisted).toMatchObject({ regNo, name: payload.name })
    const listed = await get('/api/students', auth('admin', admin.id))
    expect(listed.some((student) => student.regNo === regNo)).toBe(true)

    const duplicate = await post('/api/students', payload, auth('admin', admin.id))
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.message).toMatch(/registration number already exists/i)
  })

  it('lets wardens create only within their hostel and rejects student accounts', async () => {
    const warden = await userByUsername('warden')
    const student = await userByUsername('student')
    const regNo = 'TEST-WARDEN-STUDENT-2026'
    const payload = { regNo, name: 'Warden Created Student', gender: 'male', year: 1, course: 'Engineering' }

    const created = await post('/api/students', payload, auth('warden', warden.id))
    expect(created.status).toBe(201)
    expect(created.body.hostelId).toBe(warden.hostelId)

    const persisted = await prisma.student.findUnique({ where: { regNo } })
    expect(persisted).toMatchObject({ regNo, hostelId: warden.hostelId })
    const wardenList = await get('/api/students', auth('warden', warden.id))
    expect(wardenList.every((record) => record.hostelId === warden.hostelId)).toBe(true)

    const rejected = await post('/api/students', {
      ...payload,
      regNo: 'TEST-STUDENT-FORBIDDEN-2026',
    }, auth('student', student.id))
    expect(rejected.status).toBe(403)
  })
})

describe('warden scope', () => {
  it('requires an authenticated staff role for request lists', async () => {
    const nivi = await byName('Nivi Jha')
    for (const endpoint of ['/api/leaves', '/api/complaints', '/api/allocations', '/api/warden/dashboard']) {
      const anonymous = await request(app).get(endpoint)
      expect(anonymous.status).toBe(401)

      const student = await request(app).get(endpoint).set(auth('student', nivi.id))
      expect(student.status).toBe(403)
    }
  })

  it('only exposes allocations for the warden hostel', async () => {
    const warden = await userByUsername('warden')
    const list = await get('/api/allocations', auth('warden', warden.id))
    expect(list.length).toBeGreaterThan(0)
    expect(list.some((a) => a.studentName === 'Manisha Rao')).toBe(false)
    expect(list.some((a) => a.studentName === 'Aditi Deshmukh')).toBe(false)
    for (const a of list) {
      const scoped =
        a.hostelId === warden.hostelId
        || (a.hostelId === null && (a.hostelPrefs || []).includes(warden.hostelId))
      expect(scoped).toBe(true)
    }

    const aditiAllocation = await allocByName('Aditi Deshmukh')
    const meena = await userByUsername('meena')
    const meenaList = await get('/api/allocations', auth('warden', meena.id))
    expect(meenaList.some((allocation) => allocation.id === aditiAllocation.id)).toBe(true)
    const admin = await userByUsername('admin')
    const adminList = await get('/api/allocations', auth('admin', admin.id))
    expect(adminList.some((allocation) => allocation.id === aditiAllocation.id)).toBe(true)
    const forbiddenDetail = await request(app)
      .get(`/api/allocations/${aditiAllocation.id}`)
      .set(auth('warden', warden.id))
    expect(forbiddenDetail.status).toBe(403)

    const forbiddenDecision = await post(
      `/api/allocations/${aditiAllocation.id}/decision`,
      { decision: 'approved' },
      auth('warden', warden.id)
    )
    expect(forbiddenDecision.status).toBe(403)

    await post(
      `/api/allocations/${aditiAllocation.id}/decision`,
      { decision: 'approved' },
      auth('warden', meena.id)
    )
    const roomAtOtherHostel = await prisma.room.findFirst({
      where: { hostelId: { not: meena.hostelId }, medicalReserved: false },
    })
    const forbiddenAllocation = await post(
      `/api/allocations/${aditiAllocation.id}/allocate`,
      { roomId: roomAtOtherHostel.id },
      auth('warden', meena.id)
    )
    expect(forbiddenAllocation.status).toBe(403)
  })

  it('returns warden dashboard stats for the hostel', async () => {
    const warden = await userByUsername('warden')
    const data = await get('/api/warden/dashboard', auth('warden', warden.id))
    expect(data.stats.totalRooms).toBeGreaterThan(0)
    expect(data.stats.occupancy).toBeGreaterThanOrEqual(0)
    expect(data.charts.complaintsByStatus).toBeTruthy()
    expect(data.charts.blockOccupancy.length).toBeGreaterThan(0)
  })

  it('lets a hostel warden see a fresh application that prefers their hostel', async () => {
    const warden = await userByUsername('warden')
    const otherWarden = await userByUsername('meena')
    const tushar = await byName('Tushar Aggarwal')
    const created = await post('/api/allocations', { hostelPrefs: [2] }, auth('student', tushar.id))
    expect(created.status).toBe(201)
    const persisted = await prisma.allocation.findUnique({ where: { id: created.body.id } })
    expect(persisted).toMatchObject({ studentId: tushar.id, status: 'applied', hostelId: null })

    const list = await get('/api/allocations', auth('warden', warden.id))
    const mine = list.find((a) => a.id === created.body.id)
    expect(mine).toBeTruthy()
    expect(mine.status).toBe('applied')

    const otherList = await get('/api/allocations', auth('warden', otherWarden.id))
    expect(otherList.some((a) => a.id === created.body.id)).toBe(false)
    const studentList = await get('/api/student/allocation', auth('student', tushar.id))
    expect(studentList.some((a) => a.id === created.body.id)).toBe(true)
    const ownDetail = await request(app)
      .get(`/api/allocations/${created.body.id}`)
      .set(auth('student', tushar.id))
    expect(ownDetail.status).toBe(200)
    const otherStudent = await byName('Aarav Sharma')
    const forbiddenDetail = await request(app)
      .get(`/api/allocations/${created.body.id}`)
      .set(auth('student', otherStudent.id))
    expect(forbiddenDetail.status).toBe(403)
  })

  it('lets a chief warden see all allocations', async () => {
    const chief = await userByUsername('chief')
    const list = await get('/api/allocations', auth('chief_warden', chief.id))
    expect(list.length).toBeGreaterThan(0)
    expect(list.some((a) => a.studentName === 'Manisha Rao')).toBe(true)
    expect(list.some((a) => a.studentName === 'Tushar Aggarwal')).toBe(true)
  })

  it('returns chief warden dashboard stats across hostels', async () => {
    const chief = await userByUsername('chief')
    const data = await get('/api/warden/dashboard', auth('chief_warden', chief.id))
    expect(data.stats.totalRooms).toBeGreaterThan(0)
    expect(data.stats.pendingAllocations).toBeGreaterThan(0)
    expect(data.stats.waitlisted).toBeGreaterThan(0)
  })

  it('lets a chief warden see all housekeeping tasks', async () => {
    const chief = await userByUsername('chief')
    const list = await get('/api/housekeeping', auth('chief_warden', chief.id))
    expect(list.length).toBeGreaterThan(0)
  })
})

describe('allocation workflow', () => {
  it('blocks a student who already has an active application', async () => {
    const manisha = await byName('Manisha Rao')
    const res = await post('/api/allocations', { hostelPrefs: [5] }, auth('student', manisha.id))
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('already have an active application')
  })

  it('moves an application to approved and allocates a room', async () => {
    const aditi = await byName('Aditi Deshmukh')
    const allocation = await allocByName('Aditi Deshmukh')
    const meena = await userByUsername('meena')

    const decision = await post(
      `/api/allocations/${allocation.id}/decision`,
      { decision: 'approved' },
      auth('warden', meena.id)
    )
    expect(decision.status).toBe(200)
    expect(decision.body.status).toBe('approved')

    const allocated = await post(
      `/api/allocations/${allocation.id}/allocate`,
      {},
      auth('warden', meena.id)
    )
    expect(allocated.status).toBe(200)
    expect(allocated.body.status).toBe('allocated')
    expect(allocated.body.roomId).toBeTruthy()
    expect(allocated.body.hostelId).toBe(5)

    const occupants = await prisma.student.findMany({ where: { roomId: allocated.body.roomId } })
    expect(occupants.some((s) => s.id === aditi.id)).toBe(true)
    const updated = await prisma.student.findUnique({ where: { id: aditi.id } })
    expect(updated.roomno).toBe(allocated.body.roomNo)
  })

  it('checks an allocated student in', async () => {
    const allocation = await allocByName('Aditi Deshmukh')
    const meena = await userByUsername('meena')
    const headers = auth('warden', meena.id)
    await post(`/api/allocations/${allocation.id}/decision`, { decision: 'approved' }, headers)
    await post(`/api/allocations/${allocation.id}/allocate`, {}, headers)
    const checkin = await post(`/api/allocations/${allocation.id}/checkin`, {}, headers)
    expect(checkin.status).toBe(200)
    expect(checkin.body.status).toBe('occupied')
    const aditi = await byName('Aditi Deshmukh')
    expect(aditi.active).toBe(true)
  })

  it('waitlists then allocates a room', async () => {
    const simran = await byName('Simran Kaur')
    const allocation = await allocByName('Simran Kaur')
    const admin = await userByUsername('admin')
    const headers = auth('admin', admin.id)

    const waitlist = await post(`/api/allocations/${allocation.id}/decision`, { decision: 'waitlist' }, headers)
    expect(waitlist.body.status).toBe('waitlisted')

    const allocated = await post(`/api/allocations/${allocation.id}/allocate`, {}, headers)
    expect(allocated.status).toBe(200)
    expect(allocated.body.status).toBe('allocated')
    const updated = await prisma.student.findUnique({ where: { id: simran.id } })
    expect(updated.roomno).toBe(allocated.body.roomNo)
  })

  it('transfers an occupied allocation to another room', async () => {
    const allocation = await allocByName('Aditi Deshmukh')
    const meena = await userByUsername('meena')
    const headers = auth('warden', meena.id)
    await post(`/api/allocations/${allocation.id}/decision`, { decision: 'approved' }, headers)
    await post(`/api/allocations/${allocation.id}/allocate`, {}, headers)
    await post(`/api/allocations/${allocation.id}/checkin`, {}, headers)

    const current = await prisma.allocation.findUnique({ where: { id: allocation.id } })
    const occupiedStudents = await prisma.student.findMany({ where: { roomId: { not: null } } })
    const candidates = await prisma.room.findMany({
      where: { hostelId: 5, medicalReserved: false, NOT: { id: current.roomId } },
    })
    const target = candidates.find(
      (r) => occupiedStudents.filter((s) => s.roomId === r.id).length < r.seater
    )
    expect(target).toBeTruthy()
    const oldRoomId = current.roomId

    const res = await post(
      `/api/allocations/${allocation.id}/transfer`,
      { roomId: target.id },
      headers
    )
    expect(res.status).toBe(200)
    expect(res.body.roomNo).toBe(target.roomNo)
    const aditi = await byName('Aditi Deshmukh')
    const targetOccupants = await prisma.student.findMany({ where: { roomId: target.id } })
    expect(targetOccupants.some((s) => s.id === aditi.id)).toBe(true)
    const oldRoomOccupants = await prisma.student.findMany({ where: { roomId: oldRoomId } })
    expect(oldRoomOccupants.some((s) => s.id === aditi.id)).toBe(false)
  })

  it('cancels an allocation and releases the student', async () => {
    const kabir = await byName('Kabir Malhotra')
    const allocation = await allocByName('Kabir Malhotra')
    const admin = await userByUsername('admin')
    const headers = auth('admin', admin.id)
    await post(`/api/allocations/${allocation.id}/allocate`, {}, headers)

    const res = await post(`/api/allocations/${allocation.id}/cancel`, {}, headers)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('cancelled')
    const updated = await prisma.student.findUnique({ where: { id: kabir.id } })
    expect(updated.roomno).toBe(null)
    expect(updated.hostelId).toBe(null)
  })
})

describe('leave workflow', () => {
  it('prevents a student with an open leave from requesting another', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const res = await post(
      '/api/leaves',
      { from: '2026-08-16', to: '2026-08-17', reason: 'Errand', destination: 'Solan' },
      auth('student', raavi.id)
    )
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('already have a pending or active leave')
  })

  it('lets a student request leave and warden approve it', async () => {
    const nivi = await byName('Nivi Jha')
    const meena = await userByUsername('meena')
    const otherWarden = await userByUsername('warden')
    const dashboardBefore = await get('/api/warden/dashboard', auth('warden', meena.id))
    const created = await post(
      '/api/leaves',
      { from: '2026-08-17', to: '2026-08-17', reason: 'Shopping', destination: 'Chandigarh' },
      auth('student', nivi.id)
    )
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('pending')
    expect(created.body.studentId).toBe(nivi.id)
    expect(created.body.studentName).toBe('Nivi Jha')
    const persisted = await prisma.leave.findUnique({ where: { id: created.body.id } })
    expect(persisted).toMatchObject({ studentId: nivi.id, status: 'pending' })

    const sameHostelLeaves = await get('/api/leaves', auth('warden', meena.id))
    const otherHostelLeaves = await get('/api/leaves', auth('warden', otherWarden.id))
    expect(sameHostelLeaves.some((leave) => leave.id === created.body.id)).toBe(true)
    expect(otherHostelLeaves.some((leave) => leave.id === created.body.id)).toBe(false)
    const admin = await userByUsername('admin')
    const adminLeaves = await get('/api/leaves', auth('admin', admin.id))
    expect(adminLeaves.some((leave) => leave.id === created.body.id)).toBe(true)
    const dashboardAfter = await get('/api/warden/dashboard', auth('warden', meena.id))
    expect(dashboardAfter.stats.pendingLeaves).toBe(dashboardBefore.stats.pendingLeaves + 1)

    const forbiddenDecision = await post(
      `/api/leaves/${created.body.id}/decision`,
      { status: 'approved' },
      auth('warden', otherWarden.id)
    )
    expect(forbiddenDecision.status).toBe(403)
    const approved = await post(
      `/api/leaves/${created.body.id}/decision`,
      { status: 'approved' },
      auth('warden', meena.id)
    )
    expect(approved.status).toBe(200)
    expect(approved.body.status).toBe('approved')

    const studentLeaves = await get('/api/student/leaves', auth('student', nivi.id))
    const otherStudent = await byName('Aarav Sharma')
    const otherStudentLeaves = await get('/api/student/leaves', auth('student', otherStudent.id))
    expect(studentLeaves.some((leave) => leave.id === created.body.id && leave.status === 'approved')).toBe(true)
    expect(otherStudentLeaves.some((leave) => leave.id === created.body.id)).toBe(false)
  })

  it('activates an approved leave on departure and completes it on return', async () => {
    const nivi = await byName('Nivi Jha')
    const created = await post(
      '/api/leaves',
      { from: '2026-08-17', to: '2026-08-17', reason: 'Shopping', destination: 'Chandigarh' },
      auth('student', nivi.id)
    )
    await post(`/api/leaves/${created.body.id}/decision`, { status: 'approved' }, auth('warden', 3))

    const active = await post(`/api/leaves/${created.body.id}/activate`, {}, auth('warden', 3))
    expect(active.status).toBe(200)
    expect(active.body.status).toBe('active')
    expect(active.body.departure).toBeTruthy()

    const exitRecord = await prisma.entryExit.findFirst({
      where: { linkedLeaveId: created.body.id, type: 'exit' },
    })
    expect(exitRecord).toBeTruthy()

    const completed = await post(`/api/leaves/${created.body.id}/complete`, {}, auth('warden', 3))
    expect(completed.status).toBe(200)
    expect(completed.body.status).toBe('completed')
    expect(completed.body.actualReturn).toBeTruthy()

    const entryRecord = await prisma.entryExit.findFirst({
      where: { linkedLeaveId: created.body.id, type: 'entry' },
    })
    expect(entryRecord).toBeTruthy()
  })

  it('scopes leaves to the warden hostel', async () => {
    const meena = await userByUsername('meena')
    const list = await get('/api/leaves', auth('warden', meena.id))
    expect(list.some((l) => l.studentName === 'Raavi Aggarwal')).toBe(true)
    expect(list.some((l) => l.studentName === 'Aarav Sharma')).toBe(false)
  })
})

describe('explicit Out-Pass workflow', () => {
  it('persists typed date/time requests for the default Student and exposes decisions to that Student', async () => {
    const studentLogin = await post('/api/auth/login', {
      usernameOrEmail: 'student',
      password: 'student123',
    })
    expect(studentLogin.status).toBe(200)
    const studentUser = await userByUsername('student')
    const student = await prisma.student.findUnique({ where: { regNo: studentUser.regNo } })
    expect(student).toBeTruthy()
    expect(student.hostelId).toBe(1)

    const warden = await userByUsername('azadwarden')
    expect(warden.hostelId).toBe(student.hostelId)
    const wardenLogin = await post('/api/auth/login', {
      usernameOrEmail: 'azadwarden',
      password: 'warden123',
    })
    expect(wardenLogin.status).toBe(200)
    const studentAuth = { Authorization: `Bearer ${studentLogin.body.token}` }
    const wardenAuth = { Authorization: `Bearer ${wardenLogin.body.token}` }
    const otherWarden = await userByUsername('warden')
    const otherWardenAuth = auth('warden', otherWarden.id)
    const otherStudent = await byName('Nivi Jha')
    const dashboardBefore = await get('/api/student/dashboard', studentAuth)

    const rejectedRequest = await post(
      '/api/leaves',
      {
        requestType: 'OUTPASS',
        from: '2026-11-15',
        to: '2026-11-15',
        requestedDepartureAt: '2026-11-15T14:00:00+05:30',
        expectedReturnAt: '2026-11-15T20:30:00+05:30',
        reason: 'Personal errand',
        destination: 'Solan',
      },
      studentAuth
    )
    expect(rejectedRequest.status).toBe(201)
    expect(rejectedRequest.body).toMatchObject({
      requestType: 'OUTPASS',
      studentId: student.id,
      studentName: student.name,
      requestedDepartureAt: '2026-11-15T08:30:00.000Z',
      expectedReturnAt: '2026-11-15T15:00:00.000Z',
      status: 'pending',
    })
    const persistedRequest = await prisma.leave.findUnique({
      where: { id: rejectedRequest.body.id },
    })
    expect(persistedRequest).toMatchObject({
      requestType: 'OUTPASS',
      studentId: student.id,
      from: '2026-11-15',
      to: '2026-11-15',
      requestedDepartureAt: '2026-11-15T08:30:00.000Z',
      expectedReturnAt: '2026-11-15T15:00:00.000Z',
      reason: 'Personal errand',
      destination: 'Solan',
      parentApproved: false,
      status: 'pending',
    })

    const sameHostelRequests = await get('/api/leaves', wardenAuth)
    const otherHostelRequests = await get('/api/leaves', otherWardenAuth)
    const visibleRequest = sameHostelRequests.find((item) => item.id === rejectedRequest.body.id)
    expect(visibleRequest.studentName).toBe(student.name)
    expect(visibleRequest.student.regNo).toBe(student.regNo)
    expect(otherHostelRequests.some((item) => item.id === rejectedRequest.body.id)).toBe(false)
    const studentDashboardPending = await get('/api/student/dashboard', studentAuth)
    expect(studentDashboardPending.stats.leavesPending).toBe(dashboardBefore.stats.leavesPending + 1)
    expect(studentDashboardPending.recentRequests[0]).toMatchObject({
      id: rejectedRequest.body.id,
      requestType: 'OUTPASS',
      status: 'pending',
    })

    const forbiddenCrossHostelDecision = await post(
      `/api/leaves/${rejectedRequest.body.id}/decision`,
      { status: 'rejected' },
      otherWardenAuth
    )
    expect(forbiddenCrossHostelDecision.status).toBe(403)
    const forbiddenStudentDecision = await post(
      `/api/leaves/${rejectedRequest.body.id}/decision`,
      { status: 'approved' },
      auth('student', otherStudent.id)
    )
    expect(forbiddenStudentDecision.status).toBe(403)

    const rejected = await post(
      `/api/leaves/${rejectedRequest.body.id}/decision`,
      { status: 'rejected' },
      wardenAuth
    )
    expect(rejected.status).toBe(200)
    expect((await prisma.leave.findUnique({ where: { id: rejected.body.id } })).status).toBe('rejected')

    const approvedRequest = await post(
      '/api/leaves',
      {
        requestType: 'OUTPASS',
        from: '2026-11-16',
        to: '2026-11-16',
        requestedDepartureAt: '2026-11-16T09:00:00.000Z',
        expectedReturnAt: '2026-11-16T18:00:00.000Z',
        reason: 'Medical appointment',
        destination: 'JUIT Health Centre',
      },
      studentAuth
    )
    expect(approvedRequest.status).toBe(201)
    const approved = await post(
      `/api/leaves/${approvedRequest.body.id}/decision`,
      { status: 'approved' },
      wardenAuth
    )
    expect(approved.status).toBe(200)
    expect(approved.body.status).toBe('approved')
    expect(approved.body.parentApproved).toBe(true)

    const studentRequests = await get('/api/student/leaves', studentAuth)
    expect(studentRequests.find((item) => item.id === rejectedRequest.body.id).status).toBe('rejected')
    expect(studentRequests.find((item) => item.id === approvedRequest.body.id).status).toBe('approved')
    const otherStudentRequests = await get('/api/student/leaves', auth('student', otherStudent.id))
    expect(otherStudentRequests.some((item) => (
      item.id === rejectedRequest.body.id || item.id === approvedRequest.body.id
    ))).toBe(false)
    const studentDashboardAfterDecision = await get('/api/student/dashboard', studentAuth)
    expect(studentDashboardAfterDecision.stats.leavesPending).toBe(dashboardBefore.stats.leavesPending)
    expect(studentDashboardAfterDecision.recentRequests[0]).toMatchObject({
      id: approvedRequest.body.id,
      status: 'approved',
    })

    const invalidOutpass = await post(
      '/api/leaves',
      {
        requestType: 'OUTPASS',
        from: '2026-11-17',
        to: '2026-11-17',
        reason: 'Missing time values',
        destination: 'Solan',
      },
      studentAuth
    )
    expect(invalidOutpass.status).toBe(400)
  })

  it('does not infer OUTPASS from a one-day regular leave', async () => {
    const nivi = await byName('Nivi Jha')
    const leave = await post(
      '/api/leaves',
      {
        from: '2026-11-20',
        to: '2026-11-20',
        reason: 'A one-day leave',
        destination: 'Solan',
      },
      auth('student', nivi.id)
    )

    expect(leave.status).toBe(201)
    expect(leave.body.requestType).toBe('LEAVE')
    expect(leave.body.requestedDepartureAt).toBeNull()
    expect(leave.body.expectedReturnAt).toBeNull()
  })
})

describe('entry / exit (biometric)', () => {
  it('records an entry and flags a late punch', async () => {
    const nivi = await byName('Nivi Jha')
    const res = await post(
      '/api/entry-exit',
      { studentId: nivi.id, type: 'entry', date: '2026-08-16', time: '21:45', gate: 'Girls Hostel Gate' },
      auth('warden', 3)
    )
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('late')
    expect(res.body.lateMinutes).toBe(15)
  })

  it('flags a violation when entry is over 30 minutes late', async () => {
    const darshika = await byName('Darshika Tyagi')
    const res = await post(
      '/api/entry-exit',
      { studentId: darshika.id, type: 'entry', date: '2026-08-16', time: '22:20', gate: 'Girls Hostel Gate' },
      auth('warden', 3)
    )
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('violation')
    expect(res.body.lateMinutes).toBe(50)
  })

  it('auto-links an approved leave when the student exits', async () => {
    const nivi = await byName('Nivi Jha')
    const created = await post(
      '/api/leaves',
      { from: '2026-08-17', to: '2026-08-17', reason: 'Shopping', destination: 'Chandigarh' },
      auth('student', nivi.id)
    )
    await post(`/api/leaves/${created.body.id}/decision`, { status: 'approved' }, auth('warden', 3))

    const exit = await post(
      '/api/entry-exit',
      { studentId: nivi.id, type: 'exit', date: '2026-08-17', time: '10:05', gate: 'Main Gate' },
      auth('warden', 3)
    )
    expect(exit.body.linkedLeaveId).toBe(created.body.id)
    const leave = await prisma.leave.findUnique({ where: { id: created.body.id } })
    expect(leave.status).toBe('active')
  })

  it('rejects punch recording from a student token', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const res = await post(
      '/api/entry-exit',
      { studentId: raavi.id, type: 'entry' },
      auth('student', raavi.id)
    )
    expect(res.status).toBe(401)
  })

  it('scopes entry-exit records to the warden hostel', async () => {
    const meena = await userByUsername('meena')
    const list = await get('/api/entry-exit', auth('warden', meena.id))
    const raavi = await byName('Raavi Aggarwal')
    const nivi = await byName('Nivi Jha')
    const ids = new Set(list.map((e) => e.studentId))
    expect(ids.has(raavi.id)).toBe(true)
    expect(ids.has(nivi.id)).toBe(true)
    expect(ids.has(10)).toBe(false)
  })

  it('exposes a student their own gate records', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const list = await get('/api/student/entry-exit', auth('student', raavi.id))
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((e) => e.studentId === raavi.id)).toBe(true)
  })
})

describe('notifications', () => {
  it('lists notifications and marks one as read', async () => {
    const admin = await userByUsername('admin')
    const headers = auth('admin', admin.id)
    const list = await get('/api/notifications', headers)
    expect(list.length).toBeGreaterThan(0)
    const unread = list.find((n) => !n.read)
    expect(unread).toBeTruthy()
    await post(`/api/notifications/${unread.id}/read`, {}, headers)
    const updated = await prisma.notification.findUnique({ where: { id: unread.id } })
    expect(updated.read).toBe(true)
  })

  it('marks all notifications as read', async () => {
    const admin = await userByUsername('admin')
    await post('/api/notifications/read-all', {}, auth('admin', admin.id))
    const all = await prisma.notification.findMany()
    expect(all.every((n) => n.read)).toBe(true)
  })

  it('scopes notifications per requester', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const studentList = await get('/api/notifications', auth('student', raavi.id))
    expect(studentList.some((n) => n.id === 3)).toBe(true)
    expect(studentList.some((n) => n.id === 2)).toBe(false)

    const wardenList = await get('/api/notifications', auth('warden', 2))
    expect(wardenList.some((n) => n.id === 2)).toBe(true)
  })

  it('rejects unauthenticated notification reads and updates', async () => {
    const list = await request(app).get('/api/notifications')
    const update = await request(app).post('/api/notifications/read-all').send({})

    expect(list.status).toBe(401)
    expect(update.status).toBe(401)
  })
})

describe('notices audience', () => {
  it('filters the girls notice for female students only', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const aarav = await byName('Aarav Sharma')
    const girls = await get('/api/notices', auth('student', raavi.id))
    expect(girls.some((n) => n.id === 2)).toBe(true)
    const boys = await get('/api/notices', auth('student', aarav.id))
    expect(boys.some((n) => n.id === 2)).toBe(false)
  })
})

describe('maintenance tickets', () => {
  it('rejects student ticket creation (module removed)', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const res = await post(
      '/api/maintenance',
      { category: 'Electrical', subcategory: 'Fan not working', description: 'Fan is noisy', priority: 'high' },
      auth('student', raavi.id)
    )
    expect(res.status).toBe(404)
  })
})

describe('complaint preferred visiting hours', () => {
  it('stores a complaint and exposes it only to its student and assigned hostel staff', async () => {
    const nivi = await byName('Nivi Jha')
    const aarav = await byName('Aarav Sharma')
    const meena = await userByUsername('meena')
    const warden = await userByUsername('warden')
    const dashboardBefore = await get('/api/warden/dashboard', auth('warden', meena.id))
    const created = await post(
      '/api/complaints',
      {
        complaintType: 'Electrical',
        complaintDetails: 'Light flickers in room',
        preferredVisitingHours: '10-12',
      },
      auth('student', nivi.id)
    )
    expect(created.status).toBe(201)
    expect(created.body.preferredVisitingHours).toBe('10-12')
    expect(created.body.studentId).toBe(nivi.id)
    const persisted = await prisma.complaint.findUnique({ where: { id: created.body.id } })
    expect(persisted).toMatchObject({ studentId: nivi.id, complaintStatus: null })

    const sameHostel = await get('/api/complaints?status=new', auth('warden', meena.id))
    const otherHostel = await get('/api/complaints?status=new', auth('warden', warden.id))
    expect(sameHostel.some((complaint) => complaint.id === created.body.id)).toBe(true)
    expect(otherHostel.some((complaint) => complaint.id === created.body.id)).toBe(false)
    const dashboardAfter = await get('/api/warden/dashboard', auth('warden', meena.id))
    expect(dashboardAfter.stats.newComplaints).toBe(dashboardBefore.stats.newComplaints + 1)

    const mine = await get('/api/student/complaints', auth('student', nivi.id))
    const stored = mine.find((c) => c.id === created.body.id)
    expect(stored.preferredVisitingHours).toBe('10-12')
    const otherStudentComplaints = await get('/api/student/complaints', auth('student', aarav.id))
    expect(otherStudentComplaints.some((complaint) => complaint.id === created.body.id)).toBe(false)
    const admin = await userByUsername('admin')
    const adminList = await get('/api/complaints', auth('admin', admin.id))
    expect(adminList.some((complaint) => complaint.id === created.body.id)).toBe(true)

    const ownDetail = await request(app)
      .get(`/api/complaints/${created.body.id}`)
      .set(auth('student', nivi.id))
    expect(ownDetail.status).toBe(200)
    const forbiddenStudentDetail = await request(app)
      .get(`/api/complaints/${created.body.id}`)
      .set(auth('student', aarav.id))
    expect(forbiddenStudentDetail.status).toBe(403)

    const forbiddenDetail = await request(app)
      .get(`/api/complaints/${created.body.id}`)
      .set(auth('warden', warden.id))
    expect(forbiddenDetail.status).toBe(403)

    const forbiddenAction = await post(
      `/api/complaints/${created.body.id}/action`,
      { status: 'Resolved', remark: 'Should be blocked' },
      auth('warden', warden.id)
    )
    expect(forbiddenAction.status).toBe(403)

    const action = await post(
      `/api/complaints/${created.body.id}/action`,
      { status: 'In Process', remark: 'Electrician assigned' },
      auth('warden', meena.id)
    )
    expect(action.status).toBe(200)
    const updatedMine = await get('/api/student/complaints', auth('student', nivi.id))
    expect(updatedMine.find((complaint) => complaint.id === created.body.id).complaintStatus).toBe('In Process')
    const ownHistory = await request(app)
      .get(`/api/complaints/${created.body.id}/history`)
      .set(auth('student', nivi.id))
    expect(ownHistory.status).toBe(200)
    expect(ownHistory.body).toHaveLength(1)
    const forbiddenHistory = await request(app)
      .get(`/api/complaints/${created.body.id}/history`)
      .set(auth('warden', warden.id))
    expect(forbiddenHistory.status).toBe(403)

    const anonymous = await request(app).get('/api/complaints')
    expect(anonymous.status).toBe(401)
    const studentStaffList = await request(app)
      .get('/api/complaints')
      .set(auth('student', nivi.id))
    expect(studentStaffList.status).toBe(403)
  })
})

describe('room inventory', () => {
  it('lets an admin add and delete an item', async () => {
    const created = await post(
      '/api/inventory',
      { hostelId: 5, roomId: 1, item: 'Table lamp', quantity: 2, condition: 'Good', status: 'new', assignedTo: 'Student' },
      auth('admin', 1)
    )
    expect(created.status).toBe(201)
    expect(await prisma.inventoryItem.findFirst({ where: { item: 'Table lamp' } })).toBeTruthy()

    const removed = await del(`/api/inventory/${created.body.id}`, auth('admin', 1))
    expect(removed.status).toBe(200)
    expect(await prisma.inventoryItem.findUnique({ where: { id: created.body.id } })).toBe(null)
  })

  it('rejects non-admin inventory writes', async () => {
    const res = await post(
      '/api/inventory',
      { hostelId: 5, item: 'x', quantity: 1, condition: 'Good' },
      auth('warden', 3)
    )
    expect(res.status).toBe(401)
  })
})

describe('housekeeping', () => {
  it('scopes tasks to the warden hostel', async () => {
    const meena = await userByUsername('meena')
    const list = await get('/api/housekeeping', auth('warden', meena.id))
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((t) => t.hostelId === 5)).toBe(true)
  })

  it('lets an admin schedule a task and update it', async () => {
    const created = await post(
      '/api/housekeeping',
      { hostelId: 2, taskType: 'Room cleaning', area: 'East Wing 2nd floor', assignedTo: 'Staff H4', schedule: '2026-08-20', status: 'pending' },
      auth('admin', 1)
    )
    expect(created.status).toBe(201)
    const updated = await put(`/api/housekeeping/${created.body.id}`, { status: 'completed', inspected: true, rating: 5 }, auth('admin', 1))
    expect(updated.body.status).toBe('completed')
    expect(updated.body.inspected).toBe(true)
  })
})

describe('mess module', () => {
  it('lets a student submit feedback and a complaint', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const feedback = await post(
      '/api/mess/feedback',
      { taste: 4, quantity: 3, hygiene: 5, variety: 4, temperature: 4, overall: 4, comment: 'Nice' },
      auth('student', raavi.id)
    )
    expect(feedback.status).toBe(201)
    expect(feedback.body.studentId).toBe(raavi.id)
    expect(feedback.body.overall).toBe(4)

    const complaint = await post(
      '/api/mess/complaints',
      { subject: 'Food quality', details: 'Rice was hard' },
      auth('student', raavi.id)
    )
    expect(complaint.status).toBe(201)
    expect(complaint.body.status).toBe('open')
  })

  it('lets a warden resolve a complaint and record an inspection', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const complaint = await post(
      '/api/mess/complaints',
      { subject: 'Food quality', details: 'Rice was hard' },
      auth('student', raavi.id)
    )
    const resolved = await put(`/api/mess/complaints/${complaint.body.id}`, { status: 'resolved' }, auth('warden', 3))
    expect(resolved.body.status).toBe('resolved')

    const inspection = await post(
      '/api/mess/inspections',
      { date: '2026-08-16', area: 'Kitchen', hygiene: 5, remarks: 'Clean' },
      auth('warden', 3)
    )
    expect(inspection.status).toBe(201)
    expect(inspection.body.hygiene).toBe(5)
  })

  it('blocks students from recording inspections', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const res = await post('/api/mess/inspections', { area: 'Kitchen', hygiene: 4 }, auth('student', raavi.id))
    expect(res.status).toBe(401)
  })
})

describe('wi-fi', () => {
  it('lets an admin update an access point', async () => {
    const ap = await prisma.wifiAccessPoint.findFirst()
    const updated = await put(`/api/wifi/${ap.id}`, { status: 'online', downtime: 0, issues: [] }, auth('admin', 1))
    expect(updated.status).toBe(200)
    expect(updated.body.status).toBe('online')
  })

  it('filters by hostel', async () => {
    const list = await get('/api/wifi?hostelId=5')
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((w) => w.hostelId === 5)).toBe(true)
  })
})

describe('medical', () => {
  it('returns dispensary and incidents', async () => {
    const data = await get('/api/medical')
    expect(data.dispensary.doctor).toBeTruthy()
    expect(Array.isArray(data.incidents)).toBe(true)
  })

  it('lets an admin update the dispensary', async () => {
    const updated = await put(
      '/api/medical/dispensary',
      { doctor: 'Dr. New', nurse: 'Nurse N', contactno: '123', ambulance: '456' },
      auth('admin', 1)
    )
    expect(updated.status).toBe(200)
    expect(updated.body.doctor).toBe('Dr. New')
  })

  it('lets a warden record an incident', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const incident = await post(
      '/api/medical/incidents',
      { studentId: raavi.id, type: 'Medical', description: 'Fever', parentNotified: true },
      auth('warden', 3)
    )
    expect(incident.status).toBe(201)
    expect(incident.body.studentId).toBe(raavi.id)
  })
})

describe('security portal', () => {
  it('can view approved and active leaves at the gate', async () => {
    const list = await get('/api/leaves', auth('security', 7))
    expect(list.some((l) => ['approved', 'active'].includes(l.status))).toBe(true)
  })
})

describe('mess manager portal', () => {
  it('resolves a complaint and records an inspection', async () => {
    const raavi = await byName('Raavi Aggarwal')
    const complaint = await post(
      '/api/mess/complaints',
      { subject: 'Portion size', details: 'Small serving' },
      auth('student', raavi.id)
    )
    const resolved = await put(`/api/mess/complaints/${complaint.body.id}`, { status: 'resolved' }, auth('mess_manager', 6))
    expect(resolved.status).toBe(200)
    expect(resolved.body.status).toBe('resolved')

    const inspection = await post('/api/mess/inspections', { area: 'Dining Hall', hygiene: 4 }, auth('mess_manager', 6))
    expect(inspection.status).toBe(201)
  })

  it('updates the weekly menu', async () => {
    const updated = await put('/api/mess-menu/1', { breakfast: 'Aloo Paratha' }, auth('mess_manager', 6))
    expect(updated.status).toBe(200)
    const item = await prisma.messMenu.findUnique({ where: { id: 1 } })
    expect(item.breakfast).toBe('Aloo Paratha')
  })

  it('blocks students from updating the menu', async () => {
    const res = await put('/api/mess-menu/1', { breakfast: 'X' }, auth('student', 10))
    expect(res.status).toBe(401)
  })
})

describe('housekeeping staff portal', () => {
  it('scopes tasks to the staff hostel', async () => {
    const list = await get('/api/housekeeping', auth('housekeeping', 8))
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((t) => t.hostelId === 5)).toBe(true)
  })

  it('lets staff update a task status', async () => {
    const updated = await put('/api/housekeeping/1', { status: 'in_progress' }, auth('housekeeping', 8))
    expect(updated.status).toBe(200)
    const task = await prisma.housekeepingTask.findUnique({ where: { id: 1 } })
    expect(task.status).toBe('in_progress')
  })
})

describe('caretaker portal', () => {
  it('scopes housekeeping to the caretaker hostel', async () => {
    const list = await get('/api/housekeeping', auth('caretaker', 5))
    expect(list.every((t) => t.hostelId === 2)).toBe(true)
  })
})

describe('committee', () => {
  it('exposes members and meetings to admin and warden', async () => {
    const data = await get('/api/committee', auth('admin', 1))
    expect(data.members.length).toBeGreaterThan(0)
    expect(Array.isArray(data.meetings)).toBe(true)
    const wardenView = await get('/api/committee', auth('warden', 3))
    expect(wardenView.members.length).toBeGreaterThan(0)
  })

  it('lets an admin schedule a meeting', async () => {
    const created = await post('/api/committee/meetings', { date: '2026-08-28', agenda: 'Fees review' }, auth('admin', 1))
    expect(created.status).toBe(201)
    expect(created.body.agenda).toBe('Fees review')
  })

  it('blocks students from the committee', async () => {
    const res = await get('/api/committee', auth('student', 10))
    expect(res.message).toBe('Unauthorized')
  })
})

describe('audit logs', () => {
  it('exposes logs to admin only', async () => {
    const list = await get('/api/audit-logs', auth('admin', 1))
    expect(list.length).toBeGreaterThan(0)
    const res = await get('/api/audit-logs', auth('warden', 3))
    expect(res.message).toBe('Unauthorized')
  })

  it('records actor identity and supports filtering', async () => {
    const created = await post(
      '/api/notices',
      { title: 'Audit Probe Notice', body: 'x', category: 'General', audience: 'all' },
      auth('admin', 1)
    )
    expect(created.status).toBe(201)

    const list = await get('/api/audit-logs?entity=Notice&action=Created', auth('admin', 1))
    const probe = list.find((log) => log.target === 'Audit Probe Notice')
    expect(probe).toBeTruthy()
    expect(probe.actorId).toBe(1)
    expect(probe.actorRole).toBe('admin')
    expect(probe.actor).toBe('System Admin')
    expect(probe.entity).toBe('Notice')
  })
})

describe('parent portal', () => {
  it('returns the linked ward with their records', async () => {
    const data = await get('/api/parent/ward', auth('parent', 100))
    expect(data.student.name).toBe('Raavi Aggarwal')
    expect(Array.isArray(data.attendance)).toBe(true)
    expect(Array.isArray(data.leaves)).toBe(true)
    expect(Array.isArray(data.notices)).toBe(true)
  })

  it('rejects non-parents', async () => {
    const res = await get('/api/parent/ward', auth('student', 10))
    expect(res.message).toBe('Unauthorized')
  })
})

describe('admin reports', () => {
  it('includes mess rating and complaint stats', async () => {
    const report = await get('/api/admin/reports', auth('admin', 1))
    expect(report.messRating).toBeTruthy()
    expect(typeof report.totalComplaints).toBe('number')
    expect(report.feeSummary).toBeUndefined()
    expect(report.maintenanceSummary).toBeUndefined()
  })
})

describe('server hardening', () => {
  const distIndex = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist/index.html')

  it('returns 500 JSON for unhandled async errors instead of hanging', async () => {
    const internalError = new Error('test-only internal failure detail')
    const createSpy = vi.spyOn(prisma.student, 'create').mockRejectedValueOnce(internalError)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const res = await request(app)
        .post('/api/students')
        .set('Content-Type', 'application/json')
        .set(auth('admin', 1))
        .send({ regNo: 'TEST-ASYNC-ERROR', name: 'Async Error Test' })
        .timeout({ response: 5000 })

      expect(createSpy).toHaveBeenCalledOnce()
      expect(res.status).toBe(500)
      expect(res.headers['content-type']).toMatch(/application\/json/)
      expect(res.body).toEqual({ message: 'Internal server error' })
      expect(res.text).not.toContain(internalError.message)
      expect(res.text).not.toMatch(/stack|Error:/i)
      expect(errorLog).toHaveBeenCalledWith('Server error:', internalError.message)
    } finally {
      createSpy.mockRestore()
      errorLog.mockRestore()
    }
  })

  it('returns 404 JSON for unknown API routes', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Not found')
  })

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it.skipIf(!fs.existsSync(distIndex))('serves the client build for non-API GET routes', async () => {
    const res = await request(app).get('/admin/dashboard')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/html/)
  })
})