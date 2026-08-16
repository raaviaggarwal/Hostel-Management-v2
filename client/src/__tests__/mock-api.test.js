import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'
import { db, createStore } from '../mocks/db'
import * as seed from '../mocks/data'

const server = setupServer(...handlers)

const BASE = window.location.origin

const asRole = (role, id) => ({ Authorization: `Bearer mock-token-${role}-${id}` })
const get = (url, headers) =>
  fetch(`${BASE}${url}`, { headers }).then((r) => r.json())
const post = (url, body, headers) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json() }))

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

beforeEach(() => {
  Object.assign(db, createStore(seed))
})

describe('auth', () => {
  it('logs in admin and student with demo credentials', async () => {
    const admin = await post('/api/auth/login', { usernameOrEmail: 'admin', password: 'admin123' })
    expect(admin.status).toBe(200)
    expect(admin.body.user.role).toBe('admin')
    expect(admin.body.token).toContain('mock-token-admin-1')

    const student = await post('/api/auth/login', { usernameOrEmail: 'student', password: 'student123' })
    expect(student.status).toBe(200)
    expect(student.body.user.role).toBe('student')
  })

  it('rejects invalid credentials', async () => {
    const res = await post('/api/auth/login', { usernameOrEmail: 'student', password: 'wrong' })
    expect(res.status).toBe(401)
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
    const raavi = db.students.find((s) => s.name === 'Raavi Aggarwal')
    const list = await get('/api/student/allocation', asRole('student', raavi.id))
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
    const warden = db.users.find((u) => u.username === 'warden')
    const list = await get('/api/allocations', asRole('warden', warden.id))
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
    const warden = db.users.find((u) => u.username === 'warden')
    const data = await get('/api/warden/dashboard', asRole('warden', warden.id))
    expect(data.stats.totalRooms).toBeGreaterThan(0)
    expect(data.stats.occupancy).toBeGreaterThanOrEqual(0)
    expect(data.charts.complaintsByStatus).toBeTruthy()
    expect(data.charts.blockOccupancy.length).toBeGreaterThan(0)
  })
})

describe('allocation workflow', () => {
  const byName = (name) => db.students.find((s) => s.name === name)
  const allocByName = (name) => db.allocations.find((a) => a.studentName === name)

  it('blocks a student who already has an active application', async () => {
    const manisha = byName('Manisha Rao')
    const res = await post('/api/allocations', { hostelPrefs: [5] }, asRole('student', manisha.id))
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('already have an active application')
  })

  it('moves an application to approved and allocates a room', async () => {
    const aditi = byName('Aditi Deshmukh')
    const allocation = allocByName('Aditi Deshmukh')

    const decision = await post(
      `/api/allocations/${allocation.id}/decision`,
      { decision: 'approved' },
      asRole('warden', 2)
    )
    expect(decision.status).toBe(200)
    expect(decision.body.status).toBe('approved')

    const allocated = await post(
      `/api/allocations/${allocation.id}/allocate`,
      {},
      asRole('warden', 2)
    )
    expect(allocated.status).toBe(200)
    expect(allocated.body.status).toBe('allocated')
    expect(allocated.body.roomId).toBeTruthy()
    expect(allocated.body.hostelId).toBe(5)

    const room = db.rooms.find((r) => r.id === allocated.body.roomId)
    expect(room.occupants).toContain(aditi.id)
    expect(aditi.roomno).toBe(allocated.body.roomNo)
  })

  it('checks an allocated student in', async () => {
    const allocation = allocByName('Aditi Deshmukh')
    await post(`/api/allocations/${allocation.id}/decision`, { decision: 'approved' })
    await post(`/api/allocations/${allocation.id}/allocate`, {})
    const checkin = await post(`/api/allocations/${allocation.id}/checkin`)
    expect(checkin.status).toBe(200)
    expect(checkin.body.status).toBe('occupied')
    const aditi = byName('Aditi Deshmukh')
    expect(aditi.active).toBe(true)
  })

  it('waitlists then allocates a room', async () => {
    const simran = byName('Simran Kaur')
    const allocation = allocByName('Simran Kaur')

    const waitlist = await post(`/api/allocations/${allocation.id}/decision`, { decision: 'waitlist' })
    expect(waitlist.body.status).toBe('waitlisted')

    const allocated = await post(`/api/allocations/${allocation.id}/allocate`, {})
    expect(allocated.status).toBe(200)
    expect(allocated.body.status).toBe('allocated')
    expect(simran.roomno).toBe(allocated.body.roomNo)
  })

  it('transfers an occupied allocation to another room', async () => {
    const allocation = allocByName('Aditi Deshmukh')
    await post(`/api/allocations/${allocation.id}/decision`, { decision: 'approved' })
    await post(`/api/allocations/${allocation.id}/allocate`, {})
    await post(`/api/allocations/${allocation.id}/checkin`)

    const target = db.rooms.find(
      (r) =>
        r.hostelId === 5 &&
        !r.medicalReserved &&
        r.id !== allocation.roomId &&
        r.occupants.length < r.seater
    )
    expect(target).toBeTruthy()
    const oldRoomId = allocation.roomId

    const res = await post(
      `/api/allocations/${allocation.id}/transfer`,
      { roomId: target.id },
      asRole('warden', 2)
    )
    expect(res.status).toBe(200)
    expect(res.body.roomNo).toBe(target.roomNo)
    expect(target.occupants).toContain(byName('Aditi Deshmukh').id)
    const oldRoom = db.rooms.find((r) => r.id === oldRoomId)
    expect(oldRoom.occupants).not.toContain(byName('Aditi Deshmukh').id)
  })

  it('cancels an allocation and releases the student', async () => {
    const kabir = byName('Kabir Malhotra')
    const allocation = allocByName('Kabir Malhotra')
    await post(`/api/allocations/${allocation.id}/allocate`, {})

    const res = await post(`/api/allocations/${allocation.id}/cancel`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('cancelled')
    expect(kabir.roomno).toBe(null)
    expect(kabir.hostelId).toBe(null)
  })
})

describe('out-pass workflow', () => {
  const byName = (name) => db.students.find((s) => s.name === name)

  it('prevents a student with an open out-pass from requesting another', async () => {
    const raavi = byName('Raavi Aggarwal')
    const res = await post(
      '/api/outpasses',
      { destination: 'Solan', reason: 'Errand', departure: '2026-08-16 09:00', expectedReturn: '2026-08-16 12:00' },
      asRole('student', raavi.id)
    )
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('already have a pending or active out-pass')
  })

  it('lets a student request an out-pass and warden approve it', async () => {
    const nivi = byName('Nivi Jha')
    const created = await post(
      '/api/outpasses',
      { destination: 'Chandigarh', reason: 'Shopping', departure: '2026-08-17 10:00', expectedReturn: '2026-08-17 18:00' },
      asRole('student', nivi.id)
    )
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('pending')
    expect(created.body.studentName).toBe('Nivi Jha')

    const approved = await post(
      `/api/outpasses/${created.body.id}/decision`,
      { status: 'approved' },
      asRole('warden', 3)
    )
    expect(approved.status).toBe(200)
    expect(approved.body.status).toBe('approved')
  })

  it('activates an approved out-pass on departure and completes it on return', async () => {
    const nivi = byName('Nivi Jha')
    const created = await post(
      '/api/outpasses',
      { destination: 'Chandigarh', reason: 'Shopping', departure: '2026-08-17 10:00', expectedReturn: '2026-08-17 18:00' },
      asRole('student', nivi.id)
    )
    await post(`/api/outpasses/${created.body.id}/decision`, { status: 'approved' }, asRole('warden', 3))

    const active = await post(`/api/outpasses/${created.body.id}/activate`, {})
    expect(active.status).toBe(200)
    expect(active.body.status).toBe('active')

    const exitRecord = db.entryExit.find((e) => e.linkedOutpassId === created.body.id && e.type === 'exit')
    expect(exitRecord).toBeTruthy()

    const completed = await post(`/api/outpasses/${created.body.id}/complete`, {})
    expect(completed.status).toBe(200)
    expect(completed.body.status).toBe('completed')
    expect(completed.body.actualReturn).toBeTruthy()

    const entryRecord = db.entryExit.find((e) => e.linkedOutpassId === created.body.id && e.type === 'entry')
    expect(entryRecord).toBeTruthy()
  })

  it('scopes out-passes to the warden hostel', async () => {
    const meena = db.users.find((u) => u.username === 'meena')
    const list = await get('/api/outpasses', asRole('warden', meena.id))
    expect(list.some((o) => o.studentName === 'Raavi Aggarwal')).toBe(true)
    expect(list.some((o) => o.studentName === 'Aarav Sharma')).toBe(false)
  })
})

describe('entry / exit (biometric)', () => {
  const byName = (name) => db.students.find((s) => s.name === name)

  it('records an entry and flags a late punch', async () => {
    const res = await post(
      '/api/entry-exit',
      { studentId: byName('Nivi Jha').id, type: 'entry', date: '2026-08-16', time: '21:45', gate: 'Girls Hostel Gate' },
      asRole('warden', 3)
    )
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('late')
    expect(res.body.lateMinutes).toBe(15)
  })

  it('flags a violation when entry is over 30 minutes late', async () => {
    const res = await post(
      '/api/entry-exit',
      { studentId: byName('Darshika Tyagi').id, type: 'entry', date: '2026-08-16', time: '22:20', gate: 'Girls Hostel Gate' },
      asRole('warden', 3)
    )
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('violation')
    expect(res.body.lateMinutes).toBe(50)
  })

  it('auto-links an approved out-pass when the student exits', async () => {
    const nivi = byName('Nivi Jha')
    const created = await post(
      '/api/outpasses',
      { destination: 'Chandigarh', reason: 'Shopping', departure: '2026-08-17 10:00', expectedReturn: '2026-08-17 18:00' },
      asRole('student', nivi.id)
    )
    await post(`/api/outpasses/${created.body.id}/decision`, { status: 'approved' }, asRole('warden', 3))

    const exit = await post(
      '/api/entry-exit',
      { studentId: nivi.id, type: 'exit', date: '2026-08-17', time: '10:05', gate: 'Main Gate' },
      asRole('warden', 3)
    )
    expect(exit.body.linkedOutpassId).toBe(created.body.id)
    const outpass = db.outpasses.find((o) => o.id === created.body.id)
    expect(outpass.status).toBe('active')
  })

  it('rejects punch recording from a student token', async () => {
    const raavi = byName('Raavi Aggarwal')
    const res = await post(
      '/api/entry-exit',
      { studentId: raavi.id, type: 'entry' },
      asRole('student', raavi.id)
    )
    expect(res.status).toBe(401)
  })

  it('scopes entry-exit records to the warden hostel', async () => {
    const meena = db.users.find((u) => u.username === 'meena')
    const list = await get('/api/entry-exit', asRole('warden', meena.id))
    const ids = new Set(list.map((e) => e.studentId))
    expect(ids.has(byName('Raavi Aggarwal').id)).toBe(true)
    expect(ids.has(byName('Nivi Jha').id)).toBe(true)
    expect(ids.has(10)).toBe(false)
  })

  it('exposes a student their own gate records', async () => {
    const raavi = byName('Raavi Aggarwal')
    const list = await get('/api/student/entry-exit', asRole('student', raavi.id))
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
    expect(db.notifications.find((n) => n.id === unread.id).read).toBe(true)
  })

  it('marks all notifications as read', async () => {
    await post('/api/notifications/read-all', {})
    expect(db.notifications.every((n) => n.read)).toBe(true)
  })
})

describe('notices audience', () => {
  it('filters the girls notice for female students only', async () => {
    const raavi = db.students.find((s) => s.name === 'Raavi Aggarwal')
    const aarav = db.students.find((s) => s.name === 'Aarav Sharma')
    const girls = await get('/api/notices', asRole('student', raavi.id))
    expect(girls.some((n) => n.id === 3)).toBe(true)
    const boys = await get('/api/notices', asRole('student', aarav.id))
    expect(boys.some((n) => n.id === 3)).toBe(false)
  })
})