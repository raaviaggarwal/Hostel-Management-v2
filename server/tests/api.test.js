import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
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

beforeAll(async () => {
  await seedDatabase(prisma)
})

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
    const data = await get('/api/admin/dashboard')
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
    const data = await get('/api/admin/dashboard')
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
    const students = await get('/api/students')
    const raavi = students.find((s) => s.name === 'Raavi Aggarwal')
    expect(raavi.allocationStatus).toBe('occupied')
    const manisha = students.find((s) => s.name === 'Manisha Rao')
    expect(manisha.allocationStatus).toBe('applied')
  })
})

describe('warden scope', () => {
  it('only exposes allocations for the warden hostel', async () => {
    const warden = await userByUsername('warden')
    const list = await get('/api/allocations', auth('warden', warden.id))
    expect(list.length).toBeGreaterThan(0)
    expect(list.some((a) => a.studentName === 'Manisha Rao')).toBe(false)
    expect(list.some((a) => a.studentName === 'Aditi Deshmukh')).toBe(false)
    for (const a of list) {
      const scoped =
        a.hostelId === warden.hostelId || (a.hostelPrefs || []).includes(warden.hostelId)
      expect(scoped).toBe(true)
    }
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
    const tushar = await byName('Tushar Aggarwal')
    const created = await post('/api/allocations', { hostelPrefs: [2] }, auth('student', tushar.id))
    expect(created.status).toBe(201)
    const list = await get('/api/allocations', auth('warden', warden.id))
    const mine = list.find((a) => a.id === created.body.id)
    expect(mine).toBeTruthy()
    expect(mine.status).toBe('applied')
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

    const decision = await post(
      `/api/allocations/${allocation.id}/decision`,
      { decision: 'approved' },
      auth('warden', 2)
    )
    expect(decision.status).toBe(200)
    expect(decision.body.status).toBe('approved')

    const allocated = await post(
      `/api/allocations/${allocation.id}/allocate`,
      {},
      auth('warden', 2)
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
    await post(`/api/allocations/${allocation.id}/decision`, { decision: 'approved' })
    await post(`/api/allocations/${allocation.id}/allocate`, {})
    const checkin = await post(`/api/allocations/${allocation.id}/checkin`)
    expect(checkin.status).toBe(200)
    expect(checkin.body.status).toBe('occupied')
    const aditi = await byName('Aditi Deshmukh')
    expect(aditi.active).toBe(true)
  })

  it('waitlists then allocates a room', async () => {
    const simran = await byName('Simran Kaur')
    const allocation = await allocByName('Simran Kaur')

    const waitlist = await post(`/api/allocations/${allocation.id}/decision`, { decision: 'waitlist' })
    expect(waitlist.body.status).toBe('waitlisted')

    const allocated = await post(`/api/allocations/${allocation.id}/allocate`, {})
    expect(allocated.status).toBe(200)
    expect(allocated.body.status).toBe('allocated')
    const updated = await prisma.student.findUnique({ where: { id: simran.id } })
    expect(updated.roomno).toBe(allocated.body.roomNo)
  })

  it('transfers an occupied allocation to another room', async () => {
    const allocation = await allocByName('Aditi Deshmukh')
    await post(`/api/allocations/${allocation.id}/decision`, { decision: 'approved' })
    await post(`/api/allocations/${allocation.id}/allocate`, {})
    await post(`/api/allocations/${allocation.id}/checkin`)

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
      auth('warden', 2)
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
    await post(`/api/allocations/${allocation.id}/allocate`, {})

    const res = await post(`/api/allocations/${allocation.id}/cancel`)
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
    const created = await post(
      '/api/leaves',
      { from: '2026-08-17', to: '2026-08-17', reason: 'Shopping', destination: 'Chandigarh' },
      auth('student', nivi.id)
    )
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('pending')
    expect(created.body.studentName).toBe('Nivi Jha')

    const approved = await post(
      `/api/leaves/${created.body.id}/decision`,
      { status: 'approved' },
      auth('warden', 3)
    )
    expect(approved.status).toBe(200)
    expect(approved.body.status).toBe('approved')
  })

  it('activates an approved leave on departure and completes it on return', async () => {
    const nivi = await byName('Nivi Jha')
    const created = await post(
      '/api/leaves',
      { from: '2026-08-17', to: '2026-08-17', reason: 'Shopping', destination: 'Chandigarh' },
      auth('student', nivi.id)
    )
    await post(`/api/leaves/${created.body.id}/decision`, { status: 'approved' }, auth('warden', 3))

    const active = await post(`/api/leaves/${created.body.id}/activate`, {})
    expect(active.status).toBe(200)
    expect(active.body.status).toBe('active')
    expect(active.body.departure).toBeTruthy()

    const exitRecord = await prisma.entryExit.findFirst({
      where: { linkedLeaveId: created.body.id, type: 'exit' },
    })
    expect(exitRecord).toBeTruthy()

    const completed = await post(`/api/leaves/${created.body.id}/complete`, {})
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
    const list = await get('/api/notifications')
    expect(list.length).toBeGreaterThan(0)
    const unread = list.find((n) => !n.read)
    expect(unread).toBeTruthy()
    await post(`/api/notifications/${unread.id}/read`, {})
    const updated = await prisma.notification.findUnique({ where: { id: unread.id } })
    expect(updated.read).toBe(true)
  })

  it('marks all notifications as read', async () => {
    await post('/api/notifications/read-all', {})
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
  it('stores the preferred visiting hours with a complaint', async () => {
    const created = await post(
      '/api/complaints',
      {
        complaintType: 'Electrical',
        complaintDetails: 'Light flickers in room',
        preferredVisitingHours: '10-12',
      },
      auth('student', 10)
    )
    expect(created.status).toBe(201)
    expect(created.body.preferredVisitingHours).toBe('10-12')

    const mine = await get('/api/student/complaints', auth('student', 10))
    const stored = mine.find((c) => c.id === created.body.id)
    expect(stored.preferredVisitingHours).toBe('10-12')
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
    const res = await request(app)
      .post('/api/students')
      .set('Content-Type', 'application/json')
      .set(auth('admin', 1))
      .send({})
    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal server error')
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