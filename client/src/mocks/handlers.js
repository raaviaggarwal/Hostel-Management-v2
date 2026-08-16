import { http, HttpResponse } from 'msw'
import { db, nextId, addNotification, publicUser, logAudit } from './db'

const ok = (body, status = 200) => HttpResponse.json(body, { status })
const fail = (message, status = 400) => HttpResponse.json({ message }, { status })
const today = () => new Date().toISOString().slice(0, 10)
const timeToMinutes = (t) => {
  const match = String(t || '').trim().toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)?/)
  if (!match) return 0
  let h = Number(match[1])
  const m = Number(match[2])
  const ap = match[3]
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return h * 60 + m
}
const guardUser = (request) => {
  const user = authUserFrom(request)
  if (!user) return null
  return user.role === 'admin' || user.role === 'security' || WARDEN_ROLES.includes(user.role)
    ? user
    : null
}

const WARDEN_ROLES = ['warden', 'chief_warden', 'deputy_warden', 'assistant_warden']

function authUserFrom(request) {
  const auth = request.headers.get('Authorization') || ''
  const match = auth.match(/mock-token-(\w+)-(\d+)/)
  if (!match) return null
  return db.users.find((u) => u.role === match[1] && String(u.id) === match[2]) || null
}

function adminUser(request) {
  const user = authUserFrom(request)
  return user && user.role === 'admin' ? user : null
}

function wardenUser(request) {
  const user = authUserFrom(request)
  return user && WARDEN_ROLES.includes(user.role) ? user : null
}

function studentScope(request) {
  const user = authUserFrom(request)
  if (!user || user.role !== 'student') return null
  return db.students.find((s) => s.regNo === user.regNo) || null
}

const complaintStatusFilter = {
  all: () => true,
  new: (c) => !c.complaintStatus,
  inprocess: (c) => c.complaintStatus === 'In Process',
  closed: (c) => c.complaintStatus === 'Closed',
}

function countBy(arr, fn) {
  return arr.reduce((map, item) => {
    const key = fn(item)
    map[key] = (map[key] || 0) + 1
    return map
  }, {})
}

function hostelRoomIds(hostelId) {
  return db.blocks.filter((b) => b.hostelId === hostelId).map((b) => b.id)
}

function roomStatusLabel(room) {
  if (room.medicalReserved) return 'medical_reserved'
  if (room.occupants.length === 0 && room.status === 'available') return 'available'
  return room.status
}

function studentActiveAllocation(student) {
  return (
    db.allocations.find(
      (a) => a.studentId === student.id && !['rejected', 'cancelled'].includes(a.status)
    ) || null
  )
}

function eligibleHostels(student) {
  return db.hostels.filter(
    (h) =>
      h.gender === student.gender &&
      (h.type === 'freshers' ? student.year === 1 : student.year > 1)
  )
}

function findRoomFor(student, roomType, hostelId) {
  const candidates = db.rooms.filter(
    (r) =>
      r.hostelId === hostelId &&
      !r.medicalReserved &&
      (r.status === 'available' || r.status === 'partially_occupied') &&
      r.occupants.length < r.seater
  )
  const typed = roomType ? candidates.filter((r) => r.type === roomType) : []
  return (typed.length ? typed : candidates)[0] || null
}

function doAllocate(allocation, room, actorName) {
  const student = db.students.find((s) => s.id === allocation.studentId)
  allocation.roomId = room.id
  allocation.hostelId = room.hostelId
  allocation.roomNo = room.roomNo
  allocation.bedNo = room.occupants.length + 1
  allocation.status = 'allocated'
  allocation.updatedDate = today()
  allocation.history.push({
    status: 'allocated',
    date: today(),
    by: actorName,
    note: `Room ${room.roomNo} allocated`,
  })
  room.occupants.push(student.id)
  room.status = room.occupants.length >= room.seater ? 'full' : 'partially_occupied'
  student.roomId = room.id
  student.hostelId = room.hostelId
  student.blockId = room.blockId
  student.roomno = room.roomNo
  student.seater = room.seater
  student.feespm = room.fees
  student.stayfrom = today()
  logAudit(actorName, 'Allocated room', 'Allocation', student.name, 'Approved', 'Allocated')
  addNotification('Room allocated', `${student.name} allotted room ${room.roomNo}.`)
}

export const handlers = [
  // ---- Auth ----
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const { usernameOrEmail, password } = body
    const user = db.users.find(
      (u) =>
        (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
        u.password === password
    )
    if (!user) return fail('Invalid username/email or password', 401)
    return ok({
      token: `mock-token-${user.role}-${user.id}`,
      user: publicUser(user),
    })
  }),

  http.get('/api/auth/me', ({ request }) => {
    const user = authUserFrom(request)
    if (!user) return fail('Unauthorized', 401)
    return ok({ user: publicUser(user) })
  }),

  // ---- Notifications ----
  http.get('/api/notifications', () => ok(db.notifications)),
  http.post('/api/notifications/read-all', () => {
    db.notifications.forEach((n) => {
      n.read = true
    })
    return ok({ ok: true })
  }),
  http.post('/api/notifications/:id/read', ({ params }) => {
    const item = db.notifications.find((n) => String(n.id) === params.id)
    if (item) item.read = true
    return ok({ ok: true })
  }),

  // ---- Admin dashboard ----
  http.get('/api/admin/dashboard', () => {
    const housed = db.students.filter((s) => s.active)
    const totalCapacity = db.hostels.reduce((sum, h) => sum + h.seats, 0)
    const hostels = db.hostels.map((hostel) => {
      const ids = hostelRoomIds(hostel.id)
      const hostelRooms = db.rooms.filter((r) => ids.includes(r.blockId))
      const occupied = hostelRooms.reduce((sum, r) => sum + r.occupants.length, 0)
      return {
        id: hostel.id,
        name: hostel.name,
        code: hostel.code,
        gender: hostel.gender,
        type: hostel.type,
        campus: hostel.campus,
        address: hostel.address,
        seats: hostel.seats,
        rooms: hostelRooms.length,
        occupied,
        available: Math.max(0, hostel.seats - occupied),
        occupancyPct: hostel.seats
          ? Math.round((occupied / hostel.seats) * 100)
          : 0,
      }
    })
    const occupiedBeds = housed.length
    return ok({
      stats: {
        totalHostels: db.hostels.length,
        campusHostels: db.hostels.filter((h) => h.campus === 'campus').length,
        offCampusHostels: db.hostels.filter((h) => h.campus === 'off-campus').length,
        totalCapacity,
        occupiedBeds,
        availableBeds: Math.max(0, totalCapacity - occupiedBeds),
        occupancyPct: totalCapacity ? Math.round((occupiedBeds / totalCapacity) * 100) : 0,
        boysBeds: db.students.filter((s) => s.active && s.gender === 'male').length,
        girlsBeds: db.students.filter((s) => s.active && s.gender === 'female').length,
        pendingAllocations: db.allocations.filter((a) => ['applied', 'under_review', 'approved'].includes(a.status)).length,
        waitlisted: db.allocations.filter((a) => a.status === 'waitlisted').length,
        openComplaints: db.complaints.filter((c) => !c.complaintStatus || c.complaintStatus === 'In Process').length,
        totalComplaints: db.complaints.length,
        studentsOutside: db.outpasses.filter((o) => o.status === 'active').length,
      },
      hostels,
    })
  }),

  // ---- Warden dashboard ----
  http.get('/api/warden/dashboard', ({ request }) => {
    const user = wardenUser(request)
    if (!user) return fail('Unauthorized', 401)
    const hostelId = user.hostelId
    const ids = hostelRoomIds(hostelId)
    const rooms = db.rooms.filter((r) => ids.includes(r.blockId))
    const students = db.students.filter(
      (s) => String(s.hostelId) === String(hostelId)
    )
    const occupiedRooms = rooms.filter((r) => r.occupants.length > 0).length
    const totalBeds = rooms.reduce((sum, r) => sum + r.seater, 0)
    const usedBeds = rooms.reduce((sum, r) => sum + r.occupants.length, 0)
    const blocks = db.blocks.filter((b) => b.hostelId === hostelId)

    const wardenAllocations = db.allocations.filter(
      (a) => a.hostelId === hostelId || (a.hostelPrefs || []).includes(hostelId)
    )

    const complaints = db.complaints.filter(
      (c) => db.students.find((s) => s.id === c.studentId && String(s.hostelId) === String(hostelId))
    )

    return ok({
      stats: {
        totalStudents: students.length,
        totalRooms: rooms.length,
        occupiedRooms,
        totalBeds,
        availableBeds: Math.max(0, totalBeds - usedBeds),
        occupancy: totalBeds ? Math.round((usedBeds / totalBeds) * 100) : 0,
        studentsOutside: db.outpasses.filter((o) => o.status === 'active' && students.some((s) => s.id === o.studentId)).length,
        pendingAllocations: wardenAllocations.filter((a) => ['applied', 'under_review', 'approved'].includes(a.status)).length,
        waitlisted: wardenAllocations.filter((a) => a.status === 'waitlisted').length,
        pendingLeaves: db.leaves.filter((l) => l.status === 'pending' && students.some((s) => s.id === l.studentId)).length,
        newComplaints: complaints.filter((c) => !c.complaintStatus).length,
        openComplaints: complaints.filter((c) => !c.complaintStatus || c.complaintStatus === 'In Process').length,
        totalComplaints: complaints.length,
      },
      charts: {
        complaintsByStatus: {
          New: complaints.filter((c) => !c.complaintStatus).length,
          'In Process': complaints.filter((c) => c.complaintStatus === 'In Process').length,
          Closed: complaints.filter((c) => c.complaintStatus === 'Closed').length,
        },
        leavesByStatus: countBy(db.leaves.filter((l) => students.some((s) => s.id === l.studentId)), (l) => l.status),
        blockOccupancy: blocks.map((block) => {
          const blockRooms = rooms.filter((r) => r.blockId === block.id)
          return {
            name: block.name,
            total: blockRooms.length,
            occupied: blockRooms.filter((r) => r.occupants.length > 0).length,
          }
        }),
      },
    })
  }),

  // ---- Student profile ----
  http.get('/api/student/profile', ({ request }) => {
    const student = studentScope(request)
    if (!student) return fail('Student record not found', 404)
    return ok({
      ...student,
      role: 'student',
      email: student.emailid,
      hostelName: db.hostels.find((h) => h.id === student.hostelId)?.name || null,
      wing: student.blockId ? db.blocks.find((b) => b.id === student.blockId)?.name : null,
    })
  }),

  // ---- Student dashboard ----
  http.get('/api/student/dashboard', ({ request }) => {
    const student = studentScope(request)
    if (!student) return fail('Student record not found', 404)
    const fees = db.fees.filter((f) => f.studentId === student.id)
    const complaints = db.complaints.filter((c) => c.studentId === student.id)
    const leaves = db.leaves.filter((l) => l.studentId === student.id)
    const attendance = db.attendance.filter((a) => a.studentId === student.id)
    const allocation = studentActiveAllocation(student)
    const weekday = new Date().toLocaleDateString('en-IN', { weekday: 'long' })
    const todayMess = db.messMenu.find((m) => m.day === weekday) || null
    const room = student.roomId ? db.rooms.find((r) => r.id === student.roomId) : null

    const present = attendance.filter((a) => a.status === 'present').length
    const totalDays = attendance.length
    return ok({
      stats: {
        feesTotal: fees.reduce((s, f) => s + f.amount, 0),
        feesPaid: fees.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
        feesPending: fees.filter((f) => f.status !== 'paid').reduce((s, f) => s + f.amount, 0),
        complaintsOpen: complaints.filter((c) => !c.complaintStatus || c.complaintStatus === 'In Process').length,
        leavesPending: leaves.filter((l) => l.status === 'pending').length,
        attendancePresent: present,
        attendanceAbsent: attendance.filter((a) => a.status === 'absent').length,
        attendancePct: totalDays ? Math.round((present / totalDays) * 100) : 0,
        outpassLeft: Math.max(0, db.settings.outpassTotal - (student.outpassUsed || 0)),
      },
      student: {
        hostelId: student.hostelId,
        hostelName: db.hostels.find((h) => h.id === student.hostelId)?.name || null,
        roomNo: student.roomno,
        floor: room ? room.floor : null,
        bedNo: allocation ? allocation.bedNo : null,
        roomType: room ? room.type : null,
      },
      allocation,
      todayMess,
      recentComplaints: complaints.slice(-3).reverse(),
      recentNotices: db.notices.filter((n) => n.active).slice(0, 3),
    })
  }),

  // ---- Hostels ----
  http.get('/api/hostels', () => {
    return ok(
      db.hostels.map((hostel) => {
        const ids = hostelRoomIds(hostel.id)
        const hostelRooms = db.rooms.filter((r) => ids.includes(r.blockId))
        const occupied = hostelRooms.reduce((sum, r) => sum + r.occupants.length, 0)
        return {
          ...hostel,
          rooms: hostelRooms.length,
          occupied,
          available: Math.max(0, hostel.seats - occupied),
          wings: db.blocks.filter((b) => b.hostelId === hostel.id).length,
        }
      })
    )
  }),

  http.get('/api/hostels/:id', ({ params }) => {
    const hostel = db.hostels.find((h) => String(h.id) === params.id)
    if (!hostel) return fail('Hostel not found', 404)
    const ids = hostelRoomIds(hostel.id)
    const rooms = db.rooms.filter((r) => ids.includes(r.blockId))
    return ok({
      ...hostel,
      wings: db.blocks.filter((b) => b.hostelId === hostel.id),
      rooms: rooms.map((r) => ({
        ...r,
        wing: db.blocks.find((b) => b.id === r.blockId)?.name || '-',
        occupied: r.occupants.length,
      })),
    })
  }),

  http.post('/api/hostels', async ({ request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    const hostel = {
      id: nextId(db.hostels),
      name: body.name,
      code: body.code || body.name.slice(0, 2).toUpperCase(),
      gender: body.gender,
      type: body.type,
      campus: body.campus || 'campus',
      address: body.address || '',
      seats: Number(body.seats || 0),
      roomCount: Number(body.roomCount || 0),
      note: body.note || null,
    }
    db.hostels.push(hostel)
    return ok(hostel, 201)
  }),

  http.put('/api/hostels/:id', async ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const hostel = db.hostels.find((h) => String(h.id) === params.id)
    if (!hostel) return fail('Hostel not found', 404)
    const body = await request.json().catch(() => ({}))
    Object.assign(hostel, body)
    return ok(hostel)
  }),

  http.delete('/api/hostels/:id', ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    db.hostels = db.hostels.filter((h) => String(h.id) !== params.id)
    return ok({ ok: true })
  }),

  // ---- Blocks (wings) ----
  http.get('/api/blocks', () => ok(db.blocks)),

  http.post('/api/blocks', async ({ request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    const block = { id: nextId(db.blocks), name: body.name, hostelId: Number(body.hostelId) }
    db.blocks.push(block)
    return ok(block, 201)
  }),

  http.put('/api/blocks/:id', async ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const block = db.blocks.find((b) => String(b.id) === params.id)
    if (!block) return fail('Block not found', 404)
    const body = await request.json().catch(() => ({}))
    Object.assign(block, body)
    return ok(block)
  }),

  http.delete('/api/blocks/:id', ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    db.blocks = db.blocks.filter((b) => String(b.id) !== params.id)
    return ok({ ok: true })
  }),

  // ---- Rooms ----
  http.get('/api/rooms', ({ request }) => {
    const url = new URL(request.url)
    const hostelId = url.searchParams.get('hostelId')
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')
    const search = (url.searchParams.get('search') || '').toLowerCase()
    let list = db.rooms
    if (hostelId) {
      const ids = hostelRoomIds(Number(hostelId))
      list = list.filter((r) => ids.includes(r.blockId))
    }
    if (status && status !== 'all') list = list.filter((r) => roomStatusLabel(r) === status)
    if (type && type !== 'all') list = list.filter((r) => r.type === type)
    if (search) list = list.filter((r) => r.roomNo.toLowerCase().includes(search))
    return ok(
      list.map((r) => ({
        ...r,
        occupied: r.occupants.length,
        status: roomStatusLabel(r),
      }))
    )
  }),

  http.get('/api/rooms/:id', ({ params }) => {
    const room = db.rooms.find((r) => String(r.id) === params.id)
    if (!room) return fail('Room not found', 404)
    const occupants = room.occupants
      .map((sid) => db.students.find((s) => s.id === sid))
      .filter(Boolean)
    return ok({
      ...room,
      wing: db.blocks.find((b) => b.id === room.blockId)?.name || '-',
      hostel: db.hostels.find((h) => h.id === room.hostelId)?.name || '-',
      occupants,
      inventory: db.inventory.filter((i) => i.roomId === room.id),
    })
  }),

  http.post('/api/rooms', async ({ request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    const room = {
      id: nextId(db.rooms),
      hostelId: Number(body.hostelId),
      blockId: Number(body.blockId),
      floor: Number(body.floor || 1),
      roomNo: body.roomNo,
      type: body.type || 'double',
      seater: Number(body.seater || 2),
      status: 'available',
      occupants: [],
      fees: Number(body.fees || 0),
      medicalReserved: false,
    }
    db.rooms.push(room)
    return ok(room, 201)
  }),

  http.put('/api/rooms/:id', async ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const room = db.rooms.find((r) => String(r.id) === params.id)
    if (!room) return fail('Room not found', 404)
    const body = await request.json().catch(() => ({}))
    Object.assign(room, body)
    return ok(room)
  }),

  http.delete('/api/rooms/:id', ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    db.rooms = db.rooms.filter((r) => String(r.id) !== params.id)
    return ok({ ok: true })
  }),

  http.put('/api/rooms/:id/status', async ({ params, request }) => {
    const room = db.rooms.find((r) => String(r.id) === params.id)
    if (!room) return fail('Room not found', 404)
    const body = await request.json().catch(() => ({}))
    if (body.status === 'medical_reserved') room.medicalReserved = true
    if (body.status === 'available') room.medicalReserved = false
    room.status = body.status
    return ok(room)
  }),

  // ---- Students ----
  http.get('/api/students', ({ request }) => {
    const url = new URL(request.url)
    const search = (url.searchParams.get('search') || '').toLowerCase()
    let list = db.students
    if (search) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          String(s.regNo).includes(search) ||
          s.emailid.toLowerCase().includes(search)
      )
    }
    return ok(list.map((s) => ({ ...s, allocationStatus: studentActiveAllocation(s)?.status || null })))
  }),

  http.get('/api/students/:id', ({ params }) => {
    const student = db.students.find((s) => String(s.id) === params.id)
    return student ? ok(student) : fail('Student not found', 404)
  }),

  http.post('/api/students', async ({ request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    const student = {
      id: nextId(db.students),
      regNo: body.regNo,
      name: body.name,
      gender: body.gender,
      year: Number(body.year || 1),
      course: body.course,
      cgpa: Number(body.cgpa || 0),
      contactno: body.contactno || '',
      emailid: body.emailid || '',
      roomId: null,
      hostelId: null,
      blockId: null,
      roomno: null,
      seater: null,
      feespm: null,
      feeStatus: 'due',
      outpassUsed: 0,
      stayfrom: null,
      guardianName: body.guardianName || '',
      guardianRelation: body.guardianRelation || '',
      guardianContactno: body.guardianContactno || '',
      active: false,
    }
    db.students.push(student)
    return ok(student, 201)
  }),

  http.put('/api/students/:id', async ({ params, request }) => {
    const student = db.students.find((s) => String(s.id) === params.id)
    if (!student) return fail('Student not found', 404)
    const body = await request.json().catch(() => ({}))
    Object.assign(student, body)
    return ok(student)
  }),

  http.delete('/api/students/:id', ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    db.students = db.students.filter((s) => String(s.id) !== params.id)
    return ok({ ok: true })
  }),

  http.put('/api/students/:id/room', async ({ params, request }) => {
    const student = db.students.find((s) => String(s.id) === params.id)
    if (!student) return fail('Student not found', 404)
    const body = await request.json().catch(() => ({}))
    let room = body.roomId ? db.rooms.find((r) => String(r.id) === String(body.roomId)) : null
    if (!room && body.roomno) {
      room = db.rooms.find((r) => r.roomNo === body.roomno && r.hostelId === Number(body.hostelId || student.hostelId))
    }
    if (room) {
      const previous = student.roomId ? db.rooms.find((r) => r.id === student.roomId) : null
      if (previous) {
        previous.occupants = previous.occupants.filter((sid) => sid !== student.id)
        if (previous.occupants.length === 0 && !previous.medicalReserved) previous.status = 'available'
      }
      room.occupants.push(student.id)
      room.status = room.occupants.length >= room.seater ? 'full' : 'partially_occupied'
      student.roomId = room.id
      student.hostelId = room.hostelId
      student.blockId = room.blockId
      student.roomno = room.roomNo
      student.seater = room.seater
      student.feespm = room.fees
      student.active = true
      logAudit('Warden', 'Assigned room', 'Student', student.name, previous?.roomNo || '-', room.roomNo)
    } else {
      if (body.roomno) student.roomno = body.roomno
      if (body.blockId) student.blockId = body.blockId
      if (body.hostelId) student.hostelId = body.hostelId
    }
    addNotification('Room changed', `${student.name} moved to room ${student.roomno}.`)
    return ok(student)
  }),

  // ---- Wardens ----
  http.get('/api/wardens', () => ok(db.wardens)),

  http.post('/api/wardens', async ({ request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    const warden = { id: nextId(db.wardens), role: 'warden', hostelId: null, ...body }
    db.wardens.push(warden)
    return ok(warden, 201)
  }),

  http.put('/api/wardens/:id', async ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const warden = db.wardens.find((w) => String(w.id) === params.id)
    if (!warden) return fail('Warden not found', 404)
    const body = await request.json().catch(() => ({}))
    Object.assign(warden, body)
    return ok(warden)
  }),

  http.delete('/api/wardens/:id', ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    db.wardens = db.wardens.filter((w) => String(w.id) !== params.id)
    return ok({ ok: true })
  }),

  // ---- Allocations ----
  http.get('/api/allocations', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'all'
    const hostelId = url.searchParams.get('hostelId')
    const warden = wardenUser(request)
    const admin = adminUser(request)
    let list = db.allocations
    if (warden && !admin) {
      const scope = warden.hostelId
      list = list.filter(
        (a) => a.hostelId === scope || (a.hostelPrefs || []).includes(scope)
      )
    }
    if (hostelId && hostelId !== 'all') list = list.filter((a) => a.hostelId === Number(hostelId) || (a.hostelPrefs || []).includes(Number(hostelId)))
    if (status !== 'all') list = list.filter((a) => a.status === status)
    return ok([...list].sort((a, b) => b.id - a.id))
  }),

  http.get('/api/allocations/:id', ({ params }) => {
    const allocation = db.allocations.find((a) => String(a.id) === params.id)
    return allocation ? ok(allocation) : fail('Allocation not found', 404)
  }),

  http.get('/api/student/allocation', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(
      db.allocations
        .filter((a) => a.studentId === student.id)
        .sort((a, b) => b.id - a.id)
    )
  }),

  http.get('/api/student/application', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(
      db.allocations
        .filter((a) => a.studentId === student.id)
        .sort((a, b) => b.id - a.id)
    )
  }),

  http.post('/api/allocations', async ({ request }) => {
    const student = studentScope(request)
    if (!student) return fail('Student record not found', 404)
    if (studentActiveAllocation(student)) return fail('You already have an active application')
    const body = await request.json().catch(() => ({}))
    const prefs = Array.isArray(body.hostelPrefs) ? body.hostelPrefs.map(Number) : []
    if (prefs.length === 0) return fail('Select at least one hostel preference')
    const eligible = eligibleHostels(student).map((h) => h.id)
    if (!prefs.every((p) => eligible.includes(p))) {
      return fail('One or more hostel preferences are not eligible for you')
    }
    const allocation = {
      id: nextId(db.allocations),
      studentId: student.id,
      studentName: student.name,
      regNo: student.regNo,
      gender: student.gender,
      year: student.year,
      hostelPrefs: prefs,
      roomType: body.roomType || null,
      status: 'applied',
      hostelId: null,
      roomId: null,
      roomNo: null,
      bedNo: null,
      appliedDate: today(),
      updatedDate: today(),
      history: [{ status: 'applied', date: today(), by: student.name, note: 'Application submitted' }],
    }
    db.allocations.push(allocation)
    addNotification('Allocation submitted', `${student.name} submitted a hostel application.`)
    logAudit(student.name, 'Submitted application', 'Allocation', student.name, '-', 'Applied')
    return ok(allocation, 201)
  }),

  http.post('/api/allocations/:id/decision', async ({ params, request }) => {
    const allocation = db.allocations.find((a) => String(a.id) === params.id)
    if (!allocation) return fail('Allocation not found', 404)
    const body = await request.json().catch(() => ({}))
    const decision = body.decision
    const nextStatus = decision === 'waitlist' ? 'waitlisted' : decision
    if (!['approved', 'waitlist', 'rejected'].includes(decision)) return fail('Invalid decision')
    allocation.status = nextStatus
    allocation.updatedDate = today()
    allocation.history.push({ status: nextStatus, date: today(), by: 'Warden', note: `Decision: ${decision}` })
    addNotification(
      `Application ${decision}`,
      `${allocation.studentName}'s hostel application was ${decision}.`
    )
    logAudit('Warden', `Application ${decision}`, 'Allocation', allocation.studentName, 'Pending', decision)
    return ok(allocation)
  }),

  http.post('/api/allocations/:id/allocate', async ({ params, request }) => {
    const allocation = db.allocations.find((a) => String(a.id) === params.id)
    if (!allocation) return fail('Allocation not found', 404)
    if (!['approved', 'waitlisted'].includes(allocation.status)) {
      return fail('Only approved or waitlisted applications can be allocated')
    }
    const body = await request.json().catch(() => ({}))
    const student = db.students.find((s) => s.id === allocation.studentId)
    if (!student) return fail('Student not found', 404)

    let room = null
    if (body.roomId) {
      room = db.rooms.find((r) => String(r.id) === String(body.roomId))
      if (room && (room.medicalReserved || room.occupants.length >= room.seater)) {
        return fail('Selected room is not available')
      }
    } else {
      const order = [
        ...(allocation.hostelPrefs || []),
        ...eligibleHostels(student).map((h) => h.id),
      ]
      for (const hid of order) {
        const found = findRoomFor(student, allocation.roomType, hid)
        if (found) {
          room = found
          break
        }
      }
    }
    if (!room) return fail('No available room matches this application', 409)

    doAllocate(allocation, room, 'Warden')
    return ok(allocation)
  }),

  http.post('/api/allocations/:id/checkin', async ({ params }) => {
    const allocation = db.allocations.find((a) => String(a.id) === params.id)
    if (!allocation) return fail('Allocation not found', 404)
    if (allocation.status !== 'allocated') return fail('Only allocated rooms can be checked in')
    allocation.status = 'occupied'
    allocation.updatedDate = today()
    allocation.history.push({ status: 'occupied', date: today(), by: 'Warden', note: 'Checked in' })
    const student = db.students.find((s) => s.id === allocation.studentId)
    if (student) student.active = true
    logAudit('Warden', 'Checked in', 'Allocation', allocation.studentName, 'Allocated', 'Occupied')
    return ok(allocation)
  }),

  http.post('/api/allocations/:id/transfer', async ({ params, request }) => {
    const allocation = db.allocations.find((a) => String(a.id) === params.id)
    if (!allocation) return fail('Allocation not found', 404)
    if (allocation.status !== 'occupied') return fail('Only occupied allocations can be transferred')
    const body = await request.json().catch(() => ({}))
    const room = db.rooms.find((r) => String(r.id) === String(body.roomId))
    if (!room || room.medicalReserved || room.occupants.length >= room.seater) {
      return fail('Selected room is not available')
    }
    const student = db.students.find((s) => s.id === allocation.studentId)
    const previous = allocation.roomId ? db.rooms.find((r) => r.id === allocation.roomId) : null
    if (previous) {
      previous.occupants = previous.occupants.filter((sid) => sid !== student.id)
      if (previous.occupants.length === 0 && !previous.medicalReserved) previous.status = 'available'
    }
    room.occupants.push(student.id)
    room.status = room.occupants.length >= room.seater ? 'full' : 'partially_occupied'
    allocation.roomId = room.id
    allocation.hostelId = room.hostelId
    allocation.roomNo = room.roomNo
    allocation.bedNo = room.occupants.length
    allocation.updatedDate = today()
    allocation.history.push({ status: 'transferred', date: today(), by: 'Warden', note: `Transferred to ${room.roomNo}` })
    student.roomId = room.id
    student.hostelId = room.hostelId
    student.blockId = room.blockId
    student.roomno = room.roomNo
    logAudit('Warden', 'Transferred room', 'Allocation', student.name, previous?.roomNo || '-', room.roomNo)
    return ok(allocation)
  }),

  http.post('/api/allocations/:id/cancel', async ({ params }) => {
    const allocation = db.allocations.find((a) => String(a.id) === params.id)
    if (!allocation) return fail('Allocation not found', 404)
    const student = db.students.find((s) => s.id === allocation.studentId)
    if (allocation.roomId) {
      const room = db.rooms.find((r) => r.id === allocation.roomId)
      if (room) {
        room.occupants = room.occupants.filter((sid) => sid !== student?.id)
        if (room.occupants.length === 0 && !room.medicalReserved) room.status = 'available'
      }
      if (student) {
        student.roomId = null
        student.hostelId = null
        student.blockId = null
        student.roomno = null
        student.active = false
      }
    }
    allocation.status = 'cancelled'
    allocation.updatedDate = today()
    allocation.history.push({ status: 'cancelled', date: today(), by: allocation.studentName, note: 'Cancelled' })
    return ok(allocation)
  }),

  // ---- Complaints ----
  http.get('/api/complaints', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'all'
    const filter = complaintStatusFilter[status] || complaintStatusFilter.all
    return ok(db.complaints.filter(filter))
  }),

  http.get('/api/complaints/:id', ({ params }) => {
    const complaint = db.complaints.find((c) => String(c.id) === params.id)
    return complaint ? ok(complaint) : fail('Complaint not found', 404)
  }),

  http.get('/api/complaints/:id/history', ({ params }) => {
    const history = db.complaintHistory.filter((h) => String(h.complaintid) === params.id)
    return ok(history)
  }),

  http.post('/api/complaints', async ({ request }) => {
    const student = studentScope(request)
    if (!student) return fail('Student record not found', 404)
    const body = await request.json().catch(() => ({}))
    const complaint = {
      id: nextId(db.complaints),
      complainNumber: Math.floor(100000000 + Math.random() * 900000000),
      studentId: student.id,
      studentName: student.name,
      complaintType: body.complaintType,
      complaintDetails: body.complaintDetails,
      complaintDoc: body.complaintDoc || null,
      complaintStatus: null,
      registrationDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    db.complaints.push(complaint)
    addNotification('New complaint', `${student.name} raised a ${complaint.complaintType} complaint.`)
    return ok(complaint, 201)
  }),

  http.post('/api/complaints/:id/action', async ({ params, request }) => {
    const complaint = db.complaints.find((c) => String(c.id) === params.id)
    if (!complaint) return fail('Complaint not found', 404)
    const body = await request.json().catch(() => ({}))
    complaint.complaintStatus = body.status
    db.complaintHistory.push({
      id: nextId(db.complaintHistory),
      complaintid: complaint.id,
      compalintStatus: body.status,
      complaintRemark: body.remark || '',
      postingDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    return ok(complaint)
  }),

  http.get('/api/student/complaints', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(db.complaints.filter((c) => c.studentId === student.id))
  }),

  // ---- Leaves ----
  http.get('/api/leaves', ({ request }) => {
    const warden = wardenUser(request)
    if (!warden) return ok(db.leaves)
    return ok(
      db.leaves.filter((l) => {
        const student = db.students.find((s) => s.id === l.studentId)
        return student && String(student.hostelId) === String(warden.hostelId)
      })
    )
  }),

  http.get('/api/student/leaves', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(db.leaves.filter((l) => l.studentId === student.id).sort((a, b) => b.id - a.id))
  }),

  http.post('/api/leaves', async ({ request }) => {
    const student = studentScope(request)
    if (!student) return fail('Student record not found', 404)
    const body = await request.json().catch(() => ({}))
    const leave = {
      id: nextId(db.leaves),
      studentId: student.id,
      studentName: student.name,
      from: body.from,
      to: body.to,
      reason: body.reason,
      destination: body.destination,
      parentApproved: false,
      status: 'pending',
    }
    db.leaves.push(leave)
    addNotification('Leave request', `${student.name} requested leave (${body.from} to ${body.to}).`)
    return ok(leave, 201)
  }),

  http.post('/api/leaves/:id/decision', async ({ params, request }) => {
    const leave = db.leaves.find((l) => String(l.id) === params.id)
    if (!leave) return fail('Leave not found', 404)
    const body = await request.json().catch(() => ({}))
    if (body.status === 'approved') leave.parentApproved = true
    leave.status = body.status
    return ok(leave)
  }),

  // ---- Out-passes ----
  http.get('/api/outpasses', ({ request }) => {
    const warden = wardenUser(request)
    if (!warden) return ok(db.outpasses)
    return ok(
      db.outpasses.filter((o) => {
        const student = db.students.find((s) => s.id === o.studentId)
        return student && String(student.hostelId) === String(warden.hostelId)
      })
    )
  }),

  http.get('/api/student/outpasses', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(
      db.outpasses
        .filter((o) => o.studentId === student.id)
        .sort((a, b) => b.id - a.id)
    )
  }),

  http.post('/api/outpasses', async ({ request }) => {
    const student = studentScope(request)
    if (!student) return fail('Student record not found', 404)
    const body = await request.json().catch(() => ({}))
    const openPass = db.outpasses.find(
      (o) => o.studentId === student.id && ['pending', 'approved', 'active'].includes(o.status)
    )
    if (openPass) return fail('You already have a pending or active out-pass', 400)
    const used = db.outpasses.filter(
      (o) => o.studentId === student.id && ['approved', 'active', 'completed'].includes(o.status)
    ).length
    if (used >= db.settings.outpassTotal) return fail('Out-pass quota exhausted', 400)
    const outpass = {
      id: nextId(db.outpasses),
      studentId: student.id,
      studentName: student.name,
      passNo: used + 1,
      destination: body.destination,
      reason: body.reason,
      departure: body.departure,
      expectedReturn: body.expectedReturn,
      actualReturn: null,
      parentApproved: true,
      wardenApproved: false,
      status: 'pending',
    }
    db.outpasses.push(outpass)
    addNotification('Out-pass request', `${student.name} requested an out-pass to ${body.destination}.`)
    return ok(outpass, 201)
  }),

  http.post('/api/outpasses/:id/decision', async ({ params, request }) => {
    const outpass = db.outpasses.find((o) => String(o.id) === params.id)
    if (!outpass) return fail('Out-pass not found', 404)
    const body = await request.json().catch(() => ({}))
    if (body.status === 'approved') outpass.wardenApproved = true
    outpass.status = body.status
    const student = db.students.find((s) => s.id === outpass.studentId)
    if (student) {
      student.outpassUsed = db.outpasses.filter(
        (o) => o.studentId === student.id && ['approved', 'active', 'completed'].includes(o.status)
      ).length
    }
    return ok(outpass)
  }),

  http.post('/api/outpasses/:id/activate', async ({ params }) => {
    const outpass = db.outpasses.find((o) => String(o.id) === params.id)
    if (!outpass) return fail('Out-pass not found', 404)
    if (outpass.status !== 'approved') return fail('Only approved out-passes can be activated', 400)
    outpass.status = 'active'
    db.entryExit.push({
      id: nextId(db.entryExit),
      studentId: outpass.studentId,
      date: today(),
      time: new Date().toTimeString().slice(0, 5),
      type: 'exit',
      gate: 'Main Gate',
      status: 'normal',
      lateMinutes: 0,
      linkedOutpassId: outpass.id,
    })
    return ok(outpass)
  }),

  http.post('/api/outpasses/:id/complete', async ({ params }) => {
    const outpass = db.outpasses.find((o) => String(o.id) === params.id)
    if (!outpass) return fail('Out-pass not found', 404)
    if (outpass.status !== 'active') return fail('Only active out-passes can be completed', 400)
    outpass.status = 'completed'
    outpass.actualReturn = `${today()} ${new Date().toTimeString().slice(0, 5)}`
    db.entryExit.push({
      id: nextId(db.entryExit),
      studentId: outpass.studentId,
      date: today(),
      time: new Date().toTimeString().slice(0, 5),
      type: 'entry',
      gate: 'Main Gate',
      status: 'normal',
      lateMinutes: 0,
      linkedOutpassId: outpass.id,
    })
    return ok(outpass)
  }),

  // ---- Entry / exit (biometric) ----
  http.get('/api/entry-exit', ({ request }) => {
    const warden = wardenUser(request)
    const url = new URL(request.url)
    const studentId = url.searchParams.get('studentId')
    const date = url.searchParams.get('date')
    let list = db.entryExit
    if (studentId) list = list.filter((e) => String(e.studentId) === studentId)
    if (date) list = list.filter((e) => e.date === date)
    if (warden && warden.hostelId) {
      const ids = new Set(
        db.students.filter((s) => String(s.hostelId) === String(warden.hostelId)).map((s) => s.id)
      )
      list = list.filter((e) => ids.has(e.studentId))
    }
    return ok([...list].sort((a, b) => b.id - a.id))
  }),

  http.get('/api/student/entry-exit', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(
      db.entryExit.filter((e) => e.studentId === student.id).sort((a, b) => b.id - a.id)
    )
  }),

  http.post('/api/entry-exit', async ({ request }) => {
    const guard = guardUser(request)
    if (!guard) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    const student = db.students.find((s) => String(s.id) === String(body.studentId))
    if (!student) return fail('Student not found', 404)
    const date = body.date || today()
    const time = body.time || new Date().toTimeString().slice(0, 5)
    const type = body.type || 'entry'
    const gate =
      body.gate || (student.gender === 'female' ? 'Girls Hostel Gate' : 'Main Gate')

    let status = 'normal'
    let lateMinutes = 0
    if (type === 'entry') {
      const inTime =
        student.gender === 'female' ? db.settings.girlsInTime : db.settings.summerInTime
      const mins = timeToMinutes(time)
      const inMins = timeToMinutes(inTime)
      if (mins > inMins) {
        lateMinutes = mins - inMins
        status = lateMinutes > 30 ? 'violation' : 'late'
      }
    }

    let linkedOutpassId = null
    if (type === 'exit') {
      const op = db.outpasses.find((o) => o.studentId === student.id && o.status === 'approved')
      if (op) {
        op.status = 'active'
        linkedOutpassId = op.id
      }
    } else {
      const op = db.outpasses.find((o) => o.studentId === student.id && o.status === 'active')
      if (op) {
        op.status = 'completed'
        op.actualReturn = `${date} ${time}`
        linkedOutpassId = op.id
      }
    }

    const record = {
      id: nextId(db.entryExit),
      studentId: student.id,
      date,
      time,
      type,
      gate,
      status,
      lateMinutes,
      linkedOutpassId,
    }
    db.entryExit.push(record)
    if (status !== 'normal') {
      addNotification('Late entry', `${student.name} entered at ${time} (${status}).`)
    }
    return ok(record, 201)
  }),

  // ---- Visitors ----
  http.get('/api/visitors', () => ok(db.visitors)),

  http.get('/api/student/visitors', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(db.visitors.filter((v) => v.studentId === student.id))
  }),

  http.post('/api/visitors', async ({ request }) => {
    const student = studentScope(request)
    if (!student) return fail('Student record not found', 404)
    const body = await request.json().catch(() => ({}))
    const visitor = {
      id: nextId(db.visitors),
      studentId: student.id,
      studentName: student.name,
      visitorName: body.visitorName,
      relation: body.relation,
      date: body.date,
      inTime: body.inTime,
      outTime: null,
      purpose: body.purpose,
      status: 'pending',
    }
    db.visitors.push(visitor)
    return ok(visitor, 201)
  }),

  http.put('/api/visitors/:id', async ({ params, request }) => {
    const visitor = db.visitors.find((v) => String(v.id) === params.id)
    if (!visitor) return fail('Visitor not found', 404)
    const body = await request.json().catch(() => ({}))
    Object.assign(visitor, body)
    return ok(visitor)
  }),

  // ---- Mess menu ----
  http.get('/api/mess-menu', () => ok(db.messMenu)),

  http.put('/api/mess-menu/:id', async ({ params, request }) => {
    const item = db.messMenu.find((m) => String(m.id) === params.id)
    if (!item) return fail('Menu not found', 404)
    const body = await request.json().catch(() => ({}))
    Object.assign(item, body)
    return ok(item)
  }),

  // ---- Fees ----
  http.get('/api/fees', () => ok(db.fees)),

  http.post('/api/fees', async ({ request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    const fee = {
      id: nextId(db.fees),
      studentId: Number(body.studentId),
      studentName: body.studentName,
      amount: Number(body.amount),
      dueDate: body.dueDate,
      paidDate: null,
      status: 'due',
    }
    db.fees.push(fee)
    return ok(fee, 201)
  }),

  http.put('/api/fees/:id', async ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const fee = db.fees.find((f) => String(f.id) === params.id)
    if (!fee) return fail('Fee not found', 404)
    const body = await request.json().catch(() => ({}))
    if (body.status === 'paid' && !fee.paidDate) fee.paidDate = today()
    Object.assign(fee, body)
    return ok(fee)
  }),

  http.get('/api/student/fees', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(db.fees.filter((f) => f.studentId === student.id))
  }),

  http.post('/api/student/fees/:id/pay', async ({ params, request }) => {
    const student = studentScope(request)
    if (!student) return fail('Student record not found', 404)
    const fee = db.fees.find((f) => String(f.id) === params.id)
    if (!fee) return fail('Fee not found', 404)
    fee.status = 'paid'
    fee.paidDate = today()
    return ok(fee)
  }),

  // ---- Attendance ----
  http.get('/api/attendance', () => ok(db.attendance)),

  http.get('/api/warden/attendance/register', ({ request }) => {
    const user = wardenUser(request)
    if (!user) return fail('Unauthorized', 401)
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const blockId = url.searchParams.get('blockId')
    let students = db.students.filter((s) => String(s.hostelId) === String(user.hostelId))
    if (blockId) students = students.filter((s) => String(s.blockId) === blockId)
    const records = students.map((s) => {
      const existing = db.attendance.find((a) => a.studentId === s.id && a.date === date)
      return {
        studentId: s.id,
        regNo: s.regNo,
        name: s.name,
        roomno: s.roomno,
        status: existing ? existing.status : 'present',
      }
    })
    return ok({ records, date })
  }),

  http.put('/api/warden/attendance/register', async ({ request }) => {
    const user = wardenUser(request)
    if (!user) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    for (const r of body.records || []) {
      const existing = db.attendance.find((a) => a.studentId === r.studentId && a.date === body.date)
      if (existing) existing.status = r.status
      else db.attendance.push({ id: nextId(db.attendance), studentId: r.studentId, date: body.date, status: r.status })
    }
    return ok({ ok: true })
  }),

  http.get('/api/student/attendance', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok([])
    return ok(db.attendance.filter((a) => a.studentId === student.id))
  }),

  // ---- Notices ----
  http.get('/api/notices', ({ request }) => {
    const student = studentScope(request)
    if (!student) return ok(db.notices)
    return ok(
      db.notices.filter((n) => {
        if (n.audience === 'all' || n.audience === 'students') return true
        if (n.audience === 'girls') return student.gender === 'female'
        if (n.audience === 'boys') return student.gender === 'male'
        return false
      })
    )
  }),

  http.post('/api/notices', async ({ request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    const notice = {
      id: nextId(db.notices),
      title: body.title,
      body: body.body,
      category: body.category || 'General',
      audience: body.audience || 'all',
      date: today(),
      expiryDate: body.expiryDate || null,
      priority: body.priority || 'normal',
      active: true,
    }
    db.notices.push(notice)
    return ok(notice, 201)
  }),

  http.put('/api/notices/:id', async ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const notice = db.notices.find((n) => String(n.id) === params.id)
    if (!notice) return fail('Notice not found', 404)
    const body = await request.json().catch(() => ({}))
    Object.assign(notice, body)
    return ok(notice)
  }),

  http.delete('/api/notices/:id', ({ params, request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    db.notices = db.notices.filter((n) => String(n.id) !== params.id)
    return ok({ ok: true })
  }),

  // ---- Reports ----
  http.get('/api/admin/reports', () => {
    const paid = db.fees.filter((f) => f.status === 'paid')
    const feeSummary = {
      total: db.fees.reduce((s, f) => s + f.amount, 0),
      collected: paid.reduce((s, f) => s + f.amount, 0),
      pending: db.fees.reduce((s, f) => s + f.amount, 0) - paid.reduce((s, f) => s + f.amount, 0),
    }
    const attendance = db.attendance
    return ok({
      feeSummary,
      totalComplaints: db.complaints.length,
      openComplaints: db.complaints.filter((c) => !c.complaintStatus || c.complaintStatus === 'In Process').length,
      attendanceSummary: {
        present: attendance.filter((a) => a.status === 'present').length,
        absent: attendance.filter((a) => a.status === 'absent').length,
        leave: attendance.filter((a) => a.status === 'leave').length,
        date: attendance[0]?.date || null,
      },
      occupancy: db.hostels.map((h) => {
        const ids = hostelRoomIds(h.id)
        const hostelRooms = db.rooms.filter((r) => ids.includes(r.blockId))
        return {
          hostel: h.name,
          total: hostelRooms.length,
          occupied: hostelRooms.reduce((s, r) => s + r.occupants.length, 0),
          free: Math.max(0, h.seats - hostelRooms.reduce((s, r) => s + r.occupants.length, 0)),
        }
      }),
      complaintsByType: countBy(db.complaints, (c) => c.complaintType || 'Other'),
    })
  }),

  // ---- Settings ----
  http.get('/api/settings', () => ok(db.settings)),

  http.put('/api/settings', async ({ request }) => {
    if (!adminUser(request)) return fail('Unauthorized', 401)
    const body = await request.json().catch(() => ({}))
    Object.assign(db.settings, body)
    return ok(db.settings)
  }),
]