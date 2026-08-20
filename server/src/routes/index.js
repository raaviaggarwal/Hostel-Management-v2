import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma.js'
import {
  SECRET,
  WARDEN_ROLES,
  signToken,
  verifyToken,
  publicUser,
  BCRYPT_ROUNDS,
} from '../auth.js'

export const router = Router()

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
  const original = router[method].bind(router)
  router[method] = (...args) => original(args[0], ...args.slice(1).map((arg) => (typeof arg === 'function' ? wrap(arg) : arg)))
}

const ok = (res, body, status = 200) => res.status(status).json(body)
const fail = (res, message, status = 400) => res.status(status).json({ message })
const today = () => new Date().toISOString().slice(0, 10)
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const num = (value) => Number(value)
const pick = (obj, keys) => {
  const out = {}
  for (const key of keys) {
    if (obj && obj[key] !== undefined) out[key] = obj[key]
  }
  return out
}
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

// ---- Auth helpers ----
async function getUser(req) {
  if (req.user) return req.user
  const match = (req.headers.authorization || '').match(/^Bearer (.+)$/)
  if (!match) return null
  try {
    const payload = verifyToken(match[1])
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || user.role !== payload.role || user.tokenVersion !== payload.ver) return null
    req.user = user
    return user
  } catch {
    return null
  }
}

async function adminUser(req) {
  const user = await getUser(req)
  return user && user.role === 'admin' ? user : null
}

async function wardenUser(req) {
  const user = await getUser(req)
  return user && WARDEN_ROLES.includes(user.role) ? user : null
}

async function roleUser(req, roles) {
  const user = await getUser(req)
  return user && roles.includes(user.role) ? user : null
}

async function messUser(req) {
  return roleUser(req, ['mess_manager', 'admin', ...WARDEN_ROLES])
}

async function staffHostelUser(req) {
  const user = await getUser(req)
  return user && ['caretaker', 'housekeeping'].includes(user.role) && user.hostelId
    ? user
    : null
}

async function guardUser(req) {
  const user = await getUser(req)
  return user && (user.role === 'admin' || user.role === 'security' || WARDEN_ROLES.includes(user.role))
    ? user
    : null
}

async function parentUser(req) {
  return roleUser(req, ['parent'])
}

async function studentScope(req) {
  const user = await getUser(req)
  if (!user || user.role !== 'student' || !user.regNo) return null
  return prisma.student.findUnique({ where: { regNo: user.regNo } })
}

// ---- Data helpers ----
async function roomOccupancyMap() {
  const students = await prisma.student.findMany({ where: { roomId: { not: null } } })
  const map = new Map()
  for (const s of students) {
    const list = map.get(s.roomId) || []
    list.push(s)
    map.set(s.roomId, list)
  }
  return map
}

function roomStatusLabel(room, occupants) {
  if (room.medicalReserved) return 'medical_reserved'
  if (occupants.length === 0 && room.status === 'available') return 'available'
  return room.status
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

async function studentActiveAllocation(student) {
  return prisma.allocation.findFirst({
    where: { studentId: student.id, status: { notIn: ['rejected', 'cancelled'] } },
    orderBy: { id: 'desc' },
  })
}

async function eligibleHostels(student) {
  const hostels = await prisma.hostel.findMany({ orderBy: { id: 'asc' } })
  return hostels.filter(
    (h) =>
      h.gender === student.gender &&
      (h.type === 'freshers' ? student.year === 1 : student.year > 1)
  )
}

async function findRoomFor(student, roomType, hostelId, occ) {
  const rooms = await prisma.room.findMany({
    where: { hostelId, medicalReserved: false, status: { in: ['available', 'partially_occupied'] } },
    orderBy: { id: 'asc' },
  })
  const candidates = rooms.filter((r) => (occ.get(r.id) || []).length < r.seater)
  const typed = roomType ? candidates.filter((r) => r.type === roomType) : []
  return (typed.length ? typed : candidates)[0] || null
}

async function doAllocate(allocation, room, actorName, occ, meta = {}) {
  const student = await prisma.student.findUnique({ where: { id: allocation.studentId } })
  const bedNo = (occ.get(room.id) || []).length + 1
  const updated = await prisma.allocation.update({
    where: { id: allocation.id },
    data: {
      roomId: room.id,
      hostelId: room.hostelId,
      roomNo: room.roomNo,
      bedNo,
      status: 'allocated',
      updatedDate: today(),
      history: [
        ...(allocation.history || []),
        { status: 'allocated', date: today(), by: actorName, note: `Room ${room.roomNo} allocated` },
      ],
    },
  })
  await prisma.room.update({
    where: { id: room.id },
    data: { status: bedNo >= room.seater ? 'full' : 'partially_occupied' },
  })
  await prisma.student.update({
    where: { id: student.id },
    data: {
      roomId: room.id,
      hostelId: room.hostelId,
      blockId: room.blockId,
      roomno: room.roomNo,
      seater: room.seater,
      stayfrom: today(),
    },
  })
  await logAudit(actorName, 'Allocated room', 'Allocation', student.name, 'Approved', 'Allocated', meta)
  await addNotification('Room allocated', `${student.name} allotted room ${room.roomNo}.`, { category: 'success' })
  return updated
}

async function addNotification(title, description, opts = {}) {
  return prisma.notification.create({
    data: {
      title,
      description,
      read: false,
      date: today(),
      audience: opts.audience || 'all',
      category: opts.category || 'info',
      userId: opts.userId ?? null,
    },
  })
}

const auditMeta = (req) => ({
  actorId: req?.user?.id ?? null,
  actorRole: req?.user?.role ?? null,
  ip: req?.ip ?? null,
  userAgent: (req?.headers?.['user-agent'] || '').slice(0, 255) || null,
})

async function logAudit(actor, action, entity, target, before, after, meta = {}) {
  return prisma.auditLog.create({
    data: {
      actor,
      action,
      entity,
      target,
      before: before ?? '-',
      after: after ?? '-',
      actorId: meta.actorId ?? null,
      actorRole: meta.actorRole ?? null,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      timestamp: now(),
    },
  })
}

async function paginate(req, model, args = {}) {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50))
  const { where = {}, orderBy = { id: 'desc' }, include } = args
  const [total, items] = await Promise.all([
    model.count({ where }),
    model.findMany({ where, orderBy, include, skip: (page - 1) * pageSize, take: pageSize }),
  ])
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ---- Auth ----
const paginateList = (req, items) => {
  if (req.query.page === undefined && req.query.pageSize === undefined) return items
  const { page, pageSize } = pageFrom(req)
  const total = items.length
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
const pageFrom = (req) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50))
  return { page, pageSize }
}

// ---- Auth ----
router.post('/auth/login', async (req, res) => {
  const body = req.body || {}
  const { usernameOrEmail, password } = body
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
  })
  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return fail(res, 'Invalid username/email or password', 401)
  }
  return ok(res, { token: signToken(user), user: publicUser(user) })
})

router.get('/auth/me', async (req, res) => {
  const user = await getUser(req)
  if (!user) return fail(res, 'Unauthorized', 401)
  return ok(res, { user: publicUser(user) })
})

router.post('/auth/logout', async (req, res) => {
  const user = await getUser(req)
  if (!user) return fail(res, 'Unauthorized', 401)
  await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  })
  return ok(res, { message: 'Logged out' })
})

// ---- Notifications ----
function notificationWhereFor(user) {
  if (!user) return undefined
  if (user.role === 'admin') return undefined
  if (WARDEN_ROLES.includes(user.role)) {
    return {
      OR: [
        { audience: 'all' },
        { audience: 'wardens' },
        { audience: user.hostelId ? `hostel:${user.hostelId}` : 'never' },
        { userId: user.id },
      ],
    }
  }
  if (user.role === 'student') {
    return { OR: [{ audience: 'all' }, { audience: 'students' }, { userId: user.id }] }
  }
  return { OR: [{ audience: 'all' }, { audience: user.role }, { userId: user.id }] }
}

router.get('/notifications', async (req, res) => {
  const user = await getUser(req)
  return ok(res, paginateList(req, await prisma.notification.findMany({ where: notificationWhereFor(user) })))
})

router.post('/notifications/read-all', async (req, res) => {
  const user = await getUser(req)
  await prisma.notification.updateMany({
    where: notificationWhereFor(user) || {},
    data: { read: true },
  })
  return ok(res, { ok: true })
})

router.post('/notifications/:id/read', async (req, res) => {
  const user = await getUser(req)
  const where = { id: num(req.params.id) }
  const scoped = notificationWhereFor(user)
  if (scoped) where.OR = scoped.OR
  await prisma.notification.updateMany({ where, data: { read: true } })
  return ok(res, { ok: true })
})

// ---- Admin dashboard ----
router.get('/admin/dashboard', async (_req, res) => {
  const [hostels, rooms, housed, allocations, complaints, leaves] = await Promise.all([
    prisma.hostel.findMany({ orderBy: { id: 'asc' } }),
    prisma.room.findMany(),
    prisma.student.findMany({ where: { active: true } }),
    prisma.allocation.findMany(),
    prisma.complaint.findMany(),
    prisma.leave.findMany(),
  ])
  const occ = await roomOccupancyMap()
  const totalCapacity = hostels.reduce((sum, h) => sum + h.seats, 0)
  const hostelList = hostels.map((hostel) => {
    const hostelRooms = rooms.filter((r) => r.hostelId === hostel.id)
    const occupied = hostelRooms.reduce((sum, r) => sum + (occ.get(r.id) || []).length, 0)
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
      occupancyPct: hostel.seats ? Math.round((occupied / hostel.seats) * 100) : 0,
    }
  })
  const occupiedBeds = housed.length
  return ok(res, {
    stats: {
      totalHostels: hostels.length,
      campusHostels: hostels.filter((h) => h.campus === 'campus').length,
      offCampusHostels: hostels.filter((h) => h.campus === 'off-campus').length,
      totalCapacity,
      occupiedBeds,
      availableBeds: Math.max(0, totalCapacity - occupiedBeds),
      occupancyPct: totalCapacity ? Math.round((occupiedBeds / totalCapacity) * 100) : 0,
      boysBeds: housed.filter((s) => s.gender === 'male').length,
      girlsBeds: housed.filter((s) => s.gender === 'female').length,
      pendingAllocations: allocations.filter((a) => ['applied', 'under_review', 'approved'].includes(a.status)).length,
      waitlisted: allocations.filter((a) => a.status === 'waitlisted').length,
      openComplaints: complaints.filter((c) => !c.complaintStatus || c.complaintStatus === 'In Process').length,
      totalComplaints: complaints.length,
      studentsOutside: leaves.filter((l) => l.status === 'active').length,
    },
    hostels: hostelList,
  })
})

// ---- Warden dashboard ----
router.get('/warden/dashboard', async (req, res) => {
  const user = await wardenUser(req)
  if (!user) return fail(res, 'Unauthorized', 401)
  const hostelId = user.hostelId
  const roomWhere = hostelId ? { hostelId } : {}
  const [rooms, students, allocations, complaints, leaves, blocks] = await Promise.all([
    prisma.room.findMany({ where: roomWhere }),
    prisma.student.findMany({ where: roomWhere }),
    prisma.allocation.findMany(),
    prisma.complaint.findMany(),
    prisma.leave.findMany(),
    prisma.block.findMany({ where: roomWhere }),
  ])
  const occ = await roomOccupancyMap()
  const studentIds = new Set(students.map((s) => s.id))
  const occupiedRooms = rooms.filter((r) => (occ.get(r.id) || []).length > 0).length
  const totalBeds = rooms.reduce((sum, r) => sum + r.seater, 0)
  const usedBeds = rooms.reduce((sum, r) => sum + (occ.get(r.id) || []).length, 0)
  const wardenAllocations = hostelId
    ? allocations.filter((a) => a.hostelId === hostelId || (a.hostelPrefs || []).includes(hostelId))
    : allocations
  const scopedComplaints = complaints.filter((c) => studentIds.has(c.studentId))
  const scopedLeaves = leaves.filter((l) => studentIds.has(l.studentId))

  return ok(res, {
    stats: {
      totalStudents: students.length,
      totalRooms: rooms.length,
      occupiedRooms,
      totalBeds,
      availableBeds: Math.max(0, totalBeds - usedBeds),
      occupancy: totalBeds ? Math.round((usedBeds / totalBeds) * 100) : 0,
      studentsOutside: scopedLeaves.filter((l) => l.status === 'active').length,
      pendingAllocations: wardenAllocations.filter((a) => ['applied', 'under_review', 'approved'].includes(a.status)).length,
      waitlisted: wardenAllocations.filter((a) => a.status === 'waitlisted').length,
      pendingLeaves: scopedLeaves.filter((l) => l.status === 'pending').length,
      newComplaints: scopedComplaints.filter((c) => !c.complaintStatus).length,
      openComplaints: scopedComplaints.filter((c) => !c.complaintStatus || c.complaintStatus === 'In Process').length,
      totalComplaints: scopedComplaints.length,
    },
    charts: {
      complaintsByStatus: {
        New: scopedComplaints.filter((c) => !c.complaintStatus).length,
        'In Process': scopedComplaints.filter((c) => c.complaintStatus === 'In Process').length,
        Closed: scopedComplaints.filter((c) => c.complaintStatus === 'Closed').length,
      },
      leavesByStatus: countBy(scopedLeaves, (l) => l.status),
      blockOccupancy: blocks.map((block) => {
        const blockRooms = rooms.filter((r) => r.blockId === block.id)
        return {
          name: block.name,
          total: blockRooms.length,
          occupied: blockRooms.filter((r) => (occ.get(r.id) || []).length > 0).length,
        }
      }),
    },
  })
})

// ---- Student profile ----
router.get('/student/profile', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return fail(res, 'Student record not found', 404)
  const hostel = student.hostelId ? await prisma.hostel.findUnique({ where: { id: student.hostelId } }) : null
  const wing = student.blockId ? await prisma.block.findUnique({ where: { id: student.blockId } }) : null
  return ok(res, {
    ...student,
    role: 'student',
    email: student.emailid,
    hostelName: hostel?.name || null,
    wing: wing?.name || null,
  })
})

// ---- Student dashboard ----
router.get('/student/dashboard', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return fail(res, 'Student record not found', 404)
  const [complaints, leaves, attendance, allocation, messMenu, notices, room, hostels] = await Promise.all([
    prisma.complaint.findMany({ where: { studentId: student.id } }),
    prisma.leave.findMany({ where: { studentId: student.id } }),
    prisma.attendance.findMany({ where: { studentId: student.id } }),
    studentActiveAllocation(student),
    prisma.messMenu.findMany({ orderBy: { id: 'asc' } }),
    prisma.notice.findMany({ where: { active: true } }),
    student.roomId ? prisma.room.findUnique({ where: { id: student.roomId } }) : null,
    prisma.hostel.findMany({ orderBy: { id: 'asc' } }),
  ])
  const settings = await prisma.setting.findFirst()
  const weekday = new Date().toLocaleDateString('en-IN', { weekday: 'long' })
  const todayMess = messMenu.find((m) => m.day === weekday) || null
  const present = attendance.filter((a) => a.status === 'present').length
  const totalDays = attendance.length
  return ok(res, {
    stats: {
      complaintsOpen: complaints.filter((c) => !c.complaintStatus || c.complaintStatus === 'In Process').length,
      leavesPending: leaves.filter((l) => l.status === 'pending').length,
      attendancePresent: present,
      attendanceAbsent: attendance.filter((a) => a.status === 'absent').length,
      attendancePct: totalDays ? Math.round((present / totalDays) * 100) : 0,
      leavesLeft: Math.max(0, (settings?.leaveTotal || 0) - (student.leaveUsed || 0)),
    },
    student: {
      hostelId: student.hostelId,
      hostelName: hostels.find((h) => h.id === student.hostelId)?.name || null,
      roomNo: student.roomno,
      floor: room ? room.floor : null,
      bedNo: allocation ? allocation.bedNo : null,
      roomType: room ? room.type : null,
    },
    allocation,
    todayMess,
    recentComplaints: complaints.slice(-3).reverse(),
    recentNotices: notices.slice(0, 3),
  })
})

// ---- Hostels ----
router.get('/hostels', async (req, res) => {
  const [hostels, rooms, blocks] = await Promise.all([
    prisma.hostel.findMany({ orderBy: { id: 'asc' } }),
    prisma.room.findMany(),
    prisma.block.findMany(),
  ])
  const occ = await roomOccupancyMap()
  const list = hostels.map((hostel) => {
    const hostelRooms = rooms.filter((r) => r.hostelId === hostel.id)
    const occupied = hostelRooms.reduce((sum, r) => sum + (occ.get(r.id) || []).length, 0)
    return {
      ...hostel,
      rooms: hostelRooms.length,
      occupied,
      available: Math.max(0, hostel.seats - occupied),
      wings: blocks.filter((b) => b.hostelId === hostel.id).length,
    }
  })
  return ok(res, paginateList(req, list))
})

router.get('/hostels/:id', async (req, res) => {
  const hostel = await prisma.hostel.findUnique({ where: { id: num(req.params.id) } })
  if (!hostel) return fail(res, 'Hostel not found', 404)
  const [wings, rooms] = await Promise.all([
    prisma.block.findMany({ where: { hostelId: hostel.id }, orderBy: { id: 'asc' } }),
    prisma.room.findMany({ where: { hostelId: hostel.id }, orderBy: { id: 'asc' } }),
  ])
  const occ = await roomOccupancyMap()
  return ok(res, {
    ...hostel,
    wings,
    rooms: rooms.map((r) => ({
      ...r,
      wing: wings.find((b) => b.id === r.blockId)?.name || '-',
      occupied: (occ.get(r.id) || []).length,
    })),
  })
})

router.post('/hostels', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const hostel = await prisma.hostel.create({
    data: {
      name: body.name,
      code: body.code || String(body.name || '').slice(0, 2).toUpperCase(),
      gender: body.gender,
      type: body.type,
      campus: body.campus || 'campus',
      address: body.address || '',
      seats: num(body.seats || 0),
      roomCount: num(body.roomCount || 0),
      note: body.note || null,
    },
  })
  return ok(res, hostel, 201)
})

router.put('/hostels/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const hostel = await prisma.hostel.findUnique({ where: { id: num(req.params.id) } })
  if (!hostel) return fail(res, 'Hostel not found', 404)
  const body = req.body || {}
  const updated = await prisma.hostel.update({
    where: { id: hostel.id },
    data: pick(body, ['name', 'code', 'gender', 'type', 'campus', 'address', 'seats', 'roomCount', 'note']),
  })
  return ok(res, updated)
})

router.delete('/hostels/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  await prisma.hostel.deleteMany({ where: { id: num(req.params.id) } })
  return ok(res, { ok: true })
})

// ---- Blocks (wings) ----
router.get('/blocks', async (req, res) => {
  const list = await prisma.block.findMany({ orderBy: { id: 'asc' } })
  return ok(res, paginateList(req, list))
})

router.post('/blocks', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const block = await prisma.block.create({ data: { name: body.name, hostelId: num(body.hostelId) } })
  return ok(res, block, 201)
})

router.put('/blocks/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const block = await prisma.block.findUnique({ where: { id: num(req.params.id) } })
  if (!block) return fail(res, 'Block not found', 404)
  const body = req.body || {}
  const updated = await prisma.block.update({
    where: { id: block.id },
    data: pick(body, ['name', 'hostelId']),
  })
  return ok(res, updated)
})

router.delete('/blocks/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  await prisma.block.deleteMany({ where: { id: num(req.params.id) } })
  return ok(res, { ok: true })
})

// ---- Rooms ----
router.get('/rooms', async (req, res) => {
  const hostelId = req.query.hostelId
  const status = req.query.status
  const type = req.query.type
  const search = String(req.query.search || '').toLowerCase()
  let rooms = await prisma.room.findMany({
    where: hostelId && hostelId !== 'all' ? { hostelId: num(hostelId) } : undefined,
    orderBy: { id: 'asc' },
  })
  const occ = await roomOccupancyMap()
  const list = rooms.map((r) => ({
    ...r,
    occupied: (occ.get(r.id) || []).length,
    status: roomStatusLabel(r, occ.get(r.id) || []),
  }))
  return ok(res, paginateList(req, list.filter((r) => {
    if (status && status !== 'all' && r.status !== status) return false
    if (type && type !== 'all' && r.type !== type) return false
    if (search && !r.roomNo.toLowerCase().includes(search)) return false
    return true
  })))
})

router.get('/rooms/:id', async (req, res) => {
  const room = await prisma.room.findUnique({ where: { id: num(req.params.id) } })
  if (!room) return fail(res, 'Room not found', 404)
  const [wing, hostel, occupants, inventory] = await Promise.all([
    prisma.block.findUnique({ where: { id: room.blockId } }),
    prisma.hostel.findUnique({ where: { id: room.hostelId } }),
    prisma.student.findMany({ where: { roomId: room.id }, orderBy: { id: 'asc' } }),
    prisma.inventoryItem.findMany({ where: { roomId: room.id }, orderBy: { id: 'asc' } }),
  ])
  return ok(res, {
    ...room,
    wing: wing?.name || '-',
    hostel: hostel?.name || '-',
    occupants,
    inventory,
  })
})

router.post('/rooms', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const room = await prisma.room.create({
    data: {
      hostelId: num(body.hostelId),
      blockId: num(body.blockId),
      floor: num(body.floor || 1),
      roomNo: body.roomNo,
      type: body.type || 'double',
      seater: num(body.seater || 2),
      status: 'available',
      medicalReserved: false,
    },
  })
  return ok(res, room, 201)
})

router.put('/rooms/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const room = await prisma.room.findUnique({ where: { id: num(req.params.id) } })
  if (!room) return fail(res, 'Room not found', 404)
  const body = req.body || {}
  const updated = await prisma.room.update({
    where: { id: room.id },
    data: pick(body, ['hostelId', 'blockId', 'floor', 'roomNo', 'type', 'seater', 'status', 'medicalReserved']),
  })
  return ok(res, updated)
})

router.delete('/rooms/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  await prisma.room.deleteMany({ where: { id: num(req.params.id) } })
  return ok(res, { ok: true })
})

router.put('/rooms/:id/status', async (req, res) => {
  const room = await prisma.room.findUnique({ where: { id: num(req.params.id) } })
  if (!room) return fail(res, 'Room not found', 404)
  const body = req.body || {}
  let medicalReserved = room.medicalReserved
  if (body.status === 'medical_reserved') medicalReserved = true
  if (body.status === 'available') medicalReserved = false
  const updated = await prisma.room.update({
    where: { id: room.id },
    data: { status: body.status, medicalReserved },
  })
  return ok(res, updated)
})

// ---- Students ----
router.get('/students', async (req, res) => {
  const search = String(req.query.search || '').toLowerCase()
  const students = await prisma.student.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { regNo: { contains: search } },
            { emailid: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { id: 'asc' },
  })
  const list = []
  for (const s of students) {
    const allocation = await studentActiveAllocation(s)
    list.push({ ...s, allocationStatus: allocation?.status || null })
  }
  return ok(res, paginateList(req, list))
})

router.get('/students/:id', async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: num(req.params.id) } })
  return student ? ok(res, student) : fail(res, 'Student not found', 404)
})

const STUDENT_FIELDS = [
  'regNo', 'name', 'gender', 'year', 'course', 'cgpa', 'contactno', 'emailid',
  'roomId', 'hostelId', 'blockId', 'roomno', 'seater',
  'leaveUsed', 'stayfrom', 'guardianName', 'guardianRelation', 'guardianContactno', 'active',
]

router.post('/students', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const student = await prisma.student.create({
    data: {
      regNo: body.regNo,
      name: body.name,
      gender: body.gender,
      year: num(body.year || 1),
      course: body.course,
      cgpa: num(body.cgpa || 0),
      contactno: body.contactno || '',
      emailid: body.emailid || '',
      guardianName: body.guardianName || '',
      guardianRelation: body.guardianRelation || '',
      guardianContactno: body.guardianContactno || '',
      active: false,
    },
  })
  return ok(res, student, 201)
})

router.put('/students/:id', async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: num(req.params.id) } })
  if (!student) return fail(res, 'Student not found', 404)
  const body = req.body || {}
  const updated = await prisma.student.update({
    where: { id: student.id },
    data: pick(body, STUDENT_FIELDS),
  })
  return ok(res, updated)
})

router.delete('/students/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  await prisma.student.deleteMany({ where: { id: num(req.params.id) } })
  return ok(res, { ok: true })
})

router.put('/students/:id/room', async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: num(req.params.id) } })
  if (!student) return fail(res, 'Student not found', 404)
  const body = req.body || {}
  let room = null
  if (body.roomId) room = await prisma.room.findUnique({ where: { id: num(body.roomId) } })
  if (!room && body.roomno) {
    room = await prisma.room.findFirst({
      where: { roomNo: body.roomno, hostelId: num(body.hostelId || student.hostelId) },
    })
  }
  if (room) {
    const occ = await roomOccupancyMap()
    const previous = student.roomId
      ? await prisma.room.findUnique({ where: { id: student.roomId } })
      : null
    if (previous) {
      const prevOcc = (occ.get(previous.id) || []).filter((s) => s.id !== student.id)
      if (prevOcc.length === 0 && !previous.medicalReserved && previous.status !== 'maintenance' && previous.status !== 'blocked' && previous.status !== 'cleaning') {
        await prisma.room.update({
          where: { id: previous.id },
          data: { status: 'available' },
        })
      }
    }
    const roomOcc = occ.get(room.id) || []
    await prisma.room.update({
      where: { id: room.id },
      data: { status: roomOcc.length + 1 >= room.seater ? 'full' : 'partially_occupied' },
    })
    await prisma.student.update({
      where: { id: student.id },
      data: {
        roomId: room.id,
        hostelId: room.hostelId,
        blockId: room.blockId,
        roomno: room.roomNo,
        seater: room.seater,
        active: true,
      },
    })
    await logAudit(req.user?.name || 'Warden', 'Assigned room', 'Student', student.name, previous?.roomNo || '-', room.roomNo, auditMeta(req))
  } else {
    const data = {}
    if (body.roomno) data.roomno = body.roomno
    if (body.blockId) data.blockId = num(body.blockId)
    if (body.hostelId) data.hostelId = num(body.hostelId)
    if (Object.keys(data).length) await prisma.student.update({ where: { id: student.id }, data })
  }
  await addNotification('Room changed', `${student.name} moved to room ${student.roomno}.`)
  const updatedStudent = await prisma.student.findUnique({ where: { id: student.id } })
  return ok(res, updatedStudent)
})

// ---- Wardens ----
router.get('/wardens', async (req, res) => {
  return ok(res, await paginate(req, prisma.user, { where: { role: { in: WARDEN_ROLES } }, orderBy: { id: 'asc' } }))
})

router.post('/wardens', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const warden = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      username: `warden_${Math.random().toString(36).slice(2, 10)}`,
      password: bcrypt.hashSync(Math.random().toString(36), BCRYPT_ROUNDS),
      role: 'warden',
      hostelId: body.hostelId ? num(body.hostelId) : null,
      blockId: body.blockId ? num(body.blockId) : null,
    },
  })
  await logAudit(req.user?.name || 'Admin', 'Created warden', 'Warden', body.name, '-', 'created', auditMeta(req))
  return ok(res, publicUser(warden), 201)
})

router.put('/wardens/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const warden = await prisma.user.findUnique({ where: { id: num(req.params.id) } })
  if (!warden) return fail(res, 'Warden not found', 404)
  const body = req.body || {}
  const updated = await prisma.user.update({
    where: { id: warden.id },
    data: pick(body, ['name', 'email', 'hostelId', 'blockId']),
  })
  await logAudit(req.user?.name || 'Admin', 'Updated warden', 'Warden', warden.name, warden.email, updated.email, auditMeta(req))
  return ok(res, publicUser(updated))
})

router.delete('/wardens/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const warden = await prisma.user.findUnique({ where: { id: num(req.params.id) } })
  await prisma.user.deleteMany({ where: { id: num(req.params.id) } })
  if (warden) await logAudit(req.user?.name || 'Admin', 'Deleted warden', 'Warden', warden.name, 'active', 'deleted', auditMeta(req))
  return ok(res, { ok: true })
})

// ---- Allocations ----
router.get('/allocations', async (req, res) => {
  const status = req.query.status || 'all'
  const hostelId = req.query.hostelId
  const warden = await wardenUser(req)
  const admin = await adminUser(req)
  let list = await prisma.allocation.findMany({ orderBy: { id: 'asc' } })
  if (warden && !admin && warden.hostelId) {
    const scope = warden.hostelId
    list = list.filter((a) => a.hostelId === scope || (a.hostelPrefs || []).includes(scope))
  }
  if (hostelId && hostelId !== 'all') {
    list = list.filter((a) => a.hostelId === num(hostelId) || (a.hostelPrefs || []).includes(num(hostelId)))
  }
  if (status !== 'all') list = list.filter((a) => a.status === status)
  return ok(res, paginateList(req, [...list].sort((a, b) => b.id - a.id)))
})

router.get('/allocations/:id', async (req, res) => {
  const allocation = await prisma.allocation.findUnique({ where: { id: num(req.params.id) } })
  return allocation ? ok(res, allocation) : fail(res, 'Allocation not found', 404)
})

router.get('/student/allocation', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return ok(res, [])
  const list = await prisma.allocation.findMany({
    where: { studentId: student.id },
    orderBy: { id: 'desc' },
  })
  return ok(res, list)
})

router.get('/student/application', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return ok(res, [])
  const list = await prisma.allocation.findMany({
    where: { studentId: student.id },
    orderBy: { id: 'desc' },
  })
  return ok(res, list)
})

router.post('/allocations', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return fail(res, 'Student record not found', 404)
  if (await studentActiveAllocation(student)) return fail(res, 'You already have an active application')
  const body = req.body || {}
  const prefs = Array.isArray(body.hostelPrefs) ? body.hostelPrefs.map(Number) : []
  if (prefs.length === 0) return fail(res, 'Select at least one hostel preference')
  const eligible = (await eligibleHostels(student)).map((h) => h.id)
  if (!prefs.every((p) => eligible.includes(p))) {
    return fail(res, 'One or more hostel preferences are not eligible for you')
  }
  const allocation = await prisma.allocation.create({
    data: {
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
    },
  })
  await addNotification('Allocation submitted', `${student.name} submitted a hostel application.`)
  await logAudit(student.name, 'Submitted application', 'Allocation', student.name, '-', 'Applied', auditMeta(req))
  return ok(res, allocation, 201)
})

router.post('/allocations/:id/decision', async (req, res) => {
  const allocation = await prisma.allocation.findUnique({ where: { id: num(req.params.id) } })
  if (!allocation) return fail(res, 'Allocation not found', 404)
  const body = req.body || {}
  const decision = body.decision
  const nextStatus = decision === 'waitlist' ? 'waitlisted' : decision
  if (!['approved', 'waitlist', 'rejected'].includes(decision)) return fail(res, 'Invalid decision')
  const updated = await prisma.allocation.update({
    where: { id: allocation.id },
    data: {
      status: nextStatus,
      updatedDate: today(),
      history: [
        ...(allocation.history || []),
        { status: nextStatus, date: today(), by: 'Warden', note: `Decision: ${decision}` },
      ],
    },
  })
  await addNotification(`Application ${decision}`, `${allocation.studentName}'s hostel application was ${decision}.`)
  await logAudit('Warden', `Application ${decision}`, 'Allocation', allocation.studentName, 'Pending', decision, auditMeta(req))
  return ok(res, updated)
})

router.post('/allocations/:id/allocate', async (req, res) => {
  const allocation = await prisma.allocation.findUnique({ where: { id: num(req.params.id) } })
  if (!allocation) return fail(res, 'Allocation not found', 404)
  if (!['approved', 'waitlisted'].includes(allocation.status)) {
    return fail(res, 'Only approved or waitlisted applications can be allocated')
  }
  const body = req.body || {}
  const student = await prisma.student.findUnique({ where: { id: allocation.studentId } })
  if (!student) return fail(res, 'Student not found', 404)
  const occ = await roomOccupancyMap()
  let room = null
  if (body.roomId) {
    room = await prisma.room.findUnique({ where: { id: num(body.roomId) } })
    if (room && (room.medicalReserved || (occ.get(room.id) || []).length >= room.seater)) {
      return fail(res, 'Selected room is not available')
    }
  } else {
    const order = [...(allocation.hostelPrefs || []), ...(await eligibleHostels(student)).map((h) => h.id)]
    for (const hid of order) {
      const found = await findRoomFor(student, allocation.roomType, hid, occ)
      if (found) {
        room = found
        break
      }
    }
  }
  if (!room) return fail(res, 'No available room matches this application', 409)
  const updated = await doAllocate(allocation, room, 'Warden', occ, auditMeta(req))
  return ok(res, updated)
})

router.post('/allocations/:id/checkin', async (req, res) => {
  const allocation = await prisma.allocation.findUnique({ where: { id: num(req.params.id) } })
  if (!allocation) return fail(res, 'Allocation not found', 404)
  if (allocation.status !== 'allocated') return fail(res, 'Only allocated rooms can be checked in')
  const updated = await prisma.allocation.update({
    where: { id: allocation.id },
    data: {
      status: 'occupied',
      updatedDate: today(),
      history: [
        ...(allocation.history || []),
        { status: 'occupied', date: today(), by: 'Warden', note: 'Checked in' },
      ],
    },
  })
  await prisma.student.updateMany({
    where: { id: allocation.studentId },
    data: { active: true },
  })
  await logAudit('Warden', 'Checked in', 'Allocation', allocation.studentName, 'Allocated', 'Occupied', auditMeta(req))
  return ok(res, updated)
})

router.post('/allocations/:id/transfer', async (req, res) => {
  const allocation = await prisma.allocation.findUnique({ where: { id: num(req.params.id) } })
  if (!allocation) return fail(res, 'Allocation not found', 404)
  if (allocation.status !== 'occupied') return fail(res, 'Only occupied allocations can be transferred')
  const body = req.body || {}
  const room = await prisma.room.findUnique({ where: { id: num(body.roomId) } })
  const occ = await roomOccupancyMap()
  if (!room || room.medicalReserved || (occ.get(room.id) || []).length >= room.seater) {
    return fail(res, 'Selected room is not available')
  }
  const student = await prisma.student.findUnique({ where: { id: allocation.studentId } })
  const previous = allocation.roomId
    ? await prisma.room.findUnique({ where: { id: allocation.roomId } })
    : null
  if (previous) {
    const prevOcc = (occ.get(previous.id) || []).filter((s) => s.id !== student.id)
    if (prevOcc.length === 0 && !previous.medicalReserved && previous.status !== 'maintenance' && previous.status !== 'blocked' && previous.status !== 'cleaning') {
      await prisma.room.update({ where: { id: previous.id }, data: { status: 'available' } })
    }
  }
  const roomOcc = occ.get(room.id) || []
  await prisma.room.update({
    where: { id: room.id },
    data: { status: roomOcc.length + 1 >= room.seater ? 'full' : 'partially_occupied' },
  })
  const updated = await prisma.allocation.update({
    where: { id: allocation.id },
    data: {
      roomId: room.id,
      hostelId: room.hostelId,
      roomNo: room.roomNo,
      bedNo: roomOcc.length + 1,
      updatedDate: today(),
      history: [
        ...(allocation.history || []),
        { status: 'transferred', date: today(), by: 'Warden', note: `Transferred to ${room.roomNo}` },
      ],
    },
  })
  await prisma.student.update({
    where: { id: student.id },
    data: { roomId: room.id, hostelId: room.hostelId, blockId: room.blockId, roomno: room.roomNo },
  })
  await logAudit('Warden', 'Transferred room', 'Allocation', student.name, previous?.roomNo || '-', room.roomNo, auditMeta(req))
  return ok(res, updated)
})

router.post('/allocations/:id/cancel', async (req, res) => {
  const allocation = await prisma.allocation.findUnique({ where: { id: num(req.params.id) } })
  if (!allocation) return fail(res, 'Allocation not found', 404)
  const student = allocation.studentId
    ? await prisma.student.findUnique({ where: { id: allocation.studentId } })
    : null
  if (allocation.roomId) {
    const occ = await roomOccupancyMap()
    const room = await prisma.room.findUnique({ where: { id: allocation.roomId } })
    if (room) {
      const prevOcc = (occ.get(room.id) || []).filter((s) => s.id !== student?.id)
      if (prevOcc.length === 0 && !room.medicalReserved && room.status !== 'maintenance' && room.status !== 'blocked' && room.status !== 'cleaning') {
        await prisma.room.update({ where: { id: room.id }, data: { status: 'available' } })
      }
    }
    if (student) {
      await prisma.student.update({
        where: { id: student.id },
        data: { roomId: null, hostelId: null, blockId: null, roomno: null, active: false },
      })
    }
  }
  const updated = await prisma.allocation.update({
    where: { id: allocation.id },
    data: {
      status: 'cancelled',
      updatedDate: today(),
      history: [
        ...(allocation.history || []),
        { status: 'cancelled', date: today(), by: allocation.studentName, note: 'Cancelled' },
      ],
    },
  })
  return ok(res, updated)
})

// ---- Complaints ----
router.get('/complaints', async (req, res) => {
  const status = req.query.status || 'all'
  const filter = complaintStatusFilter[status] || complaintStatusFilter.all
  const list = await prisma.complaint.findMany({ orderBy: { id: 'asc' } })
  return ok(res, paginateList(req, list.filter(filter)))
})

router.get('/complaints/:id', async (req, res) => {
  const complaint = await prisma.complaint.findUnique({ where: { id: num(req.params.id) } })
  return complaint ? ok(res, complaint) : fail(res, 'Complaint not found', 404)
})

router.get('/complaints/:id/history', async (req, res) => {
  const rows = await prisma.complaintAction.findMany({
    where: { complaintId: num(req.params.id) },
    orderBy: { id: 'asc' },
  })
  return ok(res, rows.map((row) => ({
    id: row.id,
    complaintid: row.complaintId,
    compalintStatus: row.complaintStatus,
    complaintRemark: row.remark,
    postingDate: row.postingDate,
  })))
})

router.post('/complaints', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return fail(res, 'Student record not found', 404)
  const body = req.body || {}
  const complaint = await prisma.complaint.create({
    data: {
      complainNumber: Math.floor(100000000 + Math.random() * 900000000),
      studentId: student.id,
      studentName: student.name,
      complaintType: body.complaintType,
      complaintDetails: body.complaintDetails,
      preferredVisitingHours: body.preferredVisitingHours || null,
      complaintStatus: null,
      registrationDate: now(),
    },
  })
  await addNotification('New complaint', `${student.name} raised a ${body.complaintType} complaint.`, { audience: 'wardens', category: 'alert' })
  return ok(res, complaint, 201)
})

router.post('/complaints/:id/action', async (req, res) => {
  const complaint = await prisma.complaint.findUnique({ where: { id: num(req.params.id) } })
  if (!complaint) return fail(res, 'Complaint not found', 404)
  const body = req.body || {}
  const updated = await prisma.complaint.update({
    where: { id: complaint.id },
    data: { complaintStatus: body.status },
  })
  await prisma.complaintAction.create({
    data: {
      complaintId: complaint.id,
      complaintStatus: body.status,
      remark: body.remark || '',
      postingDate: now(),
    },
  })
  await logAudit(
    req.user?.name || 'Admin',
    'Actioned complaint',
    'Complaint',
    complaint.studentName || String(complaint.id),
    complaint.complaintStatus,
    body.status,
    auditMeta(req)
  )
  return ok(res, updated)
})

router.get('/student/complaints', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return ok(res, [])
  const list = await prisma.complaint.findMany({ where: { studentId: student.id }, orderBy: { id: 'asc' } })
  return ok(res, list)
})

// ---- Leaves ----
router.get('/leaves', async (req, res) => {
  const warden = await wardenUser(req)
  if (!warden) {
    return ok(res, paginateList(req, await prisma.leave.findMany({ orderBy: { id: 'asc' } })))
  }
  if (!warden.hostelId) {
    return ok(res, paginateList(req, await prisma.leave.findMany({ orderBy: { id: 'asc' } })))
  }
  const students = await prisma.student.findMany({ where: { hostelId: warden.hostelId } })
  const ids = new Set(students.map((s) => s.id))
  const list = await prisma.leave.findMany({ orderBy: { id: 'asc' } })
  return ok(res, paginateList(req, list.filter((l) => ids.has(l.studentId))))
})

router.get('/student/leaves', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return ok(res, [])
  const list = await prisma.leave.findMany({
    where: { studentId: student.id },
    orderBy: { id: 'desc' },
  })
  return ok(res, list)
})

router.post('/leaves', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return fail(res, 'Student record not found', 404)
  const body = req.body || {}
  const settings = await prisma.setting.findFirst()
  const openLeave = await prisma.leave.findFirst({
    where: { studentId: student.id, status: { in: ['pending', 'approved', 'active'] } },
  })
  if (openLeave) return fail(res, 'You already have a pending or active leave', 400)
  const used = await prisma.leave.count({
    where: { studentId: student.id, status: { in: ['approved', 'active', 'completed'] } },
  })
  if (used >= (settings?.leaveTotal || 0)) return fail(res, 'Leave quota exhausted', 400)
  const leave = await prisma.leave.create({
    data: {
      studentId: student.id,
      studentName: student.name,
      from: body.from,
      to: body.to,
      reason: body.reason,
      destination: body.destination,
      parentApproved: false,
      status: 'pending',
      departure: null,
      actualReturn: null,
    },
  })
  await addNotification('Leave request', `${student.name} requested leave (${body.from} to ${body.to}).`, { audience: 'wardens', category: 'alert' })
  return ok(res, leave, 201)
})

router.post('/leaves/:id/decision', async (req, res) => {
  const leave = await prisma.leave.findUnique({ where: { id: num(req.params.id) } })
  if (!leave) return fail(res, 'Leave not found', 404)
  const body = req.body || {}
  const updated = await prisma.leave.update({
    where: { id: leave.id },
    data: {
      parentApproved: body.status === 'approved' ? true : leave.parentApproved,
      status: body.status,
    },
  })
  const used = await prisma.leave.count({
    where: { studentId: leave.studentId, status: { in: ['approved', 'active', 'completed'] } },
  })
  await prisma.student.updateMany({
    where: { id: leave.studentId },
    data: { leaveUsed: used },
  })
  await logAudit(req.user?.name || 'Warden', `Leave ${body.status}`, 'Leave', leave.studentName || String(leave.studentId), leave.status, body.status, auditMeta(req))
  return ok(res, updated)
})

router.post('/leaves/:id/activate', async (req, res) => {
  const leave = await prisma.leave.findUnique({ where: { id: num(req.params.id) } })
  if (!leave) return fail(res, 'Leave not found', 404)
  if (leave.status !== 'approved') return fail(res, 'Only approved leaves can be activated', 400)
  const updated = await prisma.leave.update({
    where: { id: leave.id },
    data: { status: 'active', departure: `${today()} ${new Date().toTimeString().slice(0, 5)}` },
  })
  await prisma.entryExit.create({
    data: {
      studentId: leave.studentId,
      date: today(),
      time: new Date().toTimeString().slice(0, 5),
      type: 'exit',
      gate: 'Main Gate',
      status: 'normal',
      lateMinutes: 0,
      linkedLeaveId: leave.id,
    },
  })
  await logAudit(req.user?.name || 'Warden', 'Leave activated', 'Leave', leave.studentName || String(leave.studentId), 'approved', 'active', auditMeta(req))
  return ok(res, updated)
})

router.post('/leaves/:id/complete', async (req, res) => {
  const leave = await prisma.leave.findUnique({ where: { id: num(req.params.id) } })
  if (!leave) return fail(res, 'Leave not found', 404)
  if (leave.status !== 'active') return fail(res, 'Only active leaves can be completed', 400)
  const updated = await prisma.leave.update({
    where: { id: leave.id },
    data: { status: 'completed', actualReturn: `${today()} ${new Date().toTimeString().slice(0, 5)}` },
  })
  await prisma.entryExit.create({
    data: {
      studentId: leave.studentId,
      date: today(),
      time: new Date().toTimeString().slice(0, 5),
      type: 'entry',
      gate: 'Main Gate',
      status: 'normal',
      lateMinutes: 0,
      linkedLeaveId: leave.id,
    },
  })
  await logAudit(req.user?.name || 'Warden', 'Leave completed', 'Leave', leave.studentName || String(leave.studentId), 'active', 'completed', auditMeta(req))
  return ok(res, updated)
})

// ---- Entry / exit (biometric) ----
router.get('/entry-exit', async (req, res) => {
  const warden = await wardenUser(req)
  const studentId = req.query.studentId
  const date = req.query.date
  let list = await prisma.entryExit.findMany({ orderBy: { id: 'asc' } })
  if (studentId) list = list.filter((e) => String(e.studentId) === studentId)
  if (date) list = list.filter((e) => e.date === date)
  if (warden && warden.hostelId) {
    const students = await prisma.student.findMany({ where: { hostelId: warden.hostelId } })
    const ids = new Set(students.map((s) => s.id))
    list = list.filter((e) => ids.has(e.studentId))
  }
  return ok(res, [...list].sort((a, b) => b.id - a.id))
})

router.get('/student/entry-exit', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return ok(res, [])
  const list = await prisma.entryExit.findMany({
    where: { studentId: student.id },
    orderBy: { id: 'desc' },
  })
  return ok(res, list)
})

router.post('/entry-exit', async (req, res) => {
  const guard = await guardUser(req)
  if (!guard) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const student = await prisma.student.findUnique({ where: { id: num(body.studentId) } })
  if (!student) return fail(res, 'Student not found', 404)
  const settings = await prisma.setting.findFirst()
  const date = body.date || today()
  const time = body.time || new Date().toTimeString().slice(0, 5)
  const type = body.type || 'entry'
  const gate = body.gate || (student.gender === 'female' ? 'Girls Hostel Gate' : 'Main Gate')

  let status = 'normal'
  let lateMinutes = 0
  if (type === 'entry') {
    const inTime = student.gender === 'female' ? settings.girlsInTime : settings.summerInTime
    const mins = timeToMinutes(time)
    const inMins = timeToMinutes(inTime)
    if (mins > inMins) {
      lateMinutes = mins - inMins
      status = lateMinutes > 30 ? 'violation' : 'late'
    }
  }

  let linkedLeaveId = null
  if (type === 'exit') {
    const leave = await prisma.leave.findFirst({
      where: { studentId: student.id, status: 'approved' },
    })
    if (leave) {
      await prisma.leave.update({
        where: { id: leave.id },
        data: { status: 'active', departure: `${date} ${time}` },
      })
      linkedLeaveId = leave.id
    }
  } else {
    const leave = await prisma.leave.findFirst({
      where: { studentId: student.id, status: 'active' },
    })
    if (leave) {
      await prisma.leave.update({
        where: { id: leave.id },
        data: { status: 'completed', actualReturn: `${date} ${time}` },
      })
      linkedLeaveId = leave.id
    }
  }

  const record = await prisma.entryExit.create({
    data: {
      studentId: student.id,
      date,
      time,
      type,
      gate,
      status,
      lateMinutes,
      linkedLeaveId,
    },
  })
  if (status !== 'normal') {
    await addNotification('Late entry', `${student.name} entered at ${time} (${status}).`)
  }
  return ok(res, record, 201)
})

// ---- Room inventory ----
router.get('/inventory', async (req, res) => {
  const hostelId = req.query.hostelId
  const list = await prisma.inventoryItem.findMany({
    where: hostelId && hostelId !== 'all' ? { hostelId: num(hostelId) } : undefined,
    orderBy: { id: 'asc' },
  })
  return ok(res, list)
})

router.post('/inventory', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const item = await prisma.inventoryItem.create({
    data: {
      hostelId: num(body.hostelId),
      roomId: body.roomId ? num(body.roomId) : null,
      item: body.item,
      quantity: num(body.quantity),
      condition: body.condition,
      status: body.status || 'new',
      assignedTo: body.assignedTo || 'Student',
    },
  })
  return ok(res, item, 201)
})

router.put('/inventory/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const item = await prisma.inventoryItem.findUnique({ where: { id: num(req.params.id) } })
  if (!item) return fail(res, 'Item not found', 404)
  const body = req.body || {}
  const updated = await prisma.inventoryItem.update({
    where: { id: item.id },
    data: pick(body, ['hostelId', 'roomId', 'item', 'quantity', 'condition', 'status', 'assignedTo']),
  })
  return ok(res, updated)
})

router.delete('/inventory/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  await prisma.inventoryItem.deleteMany({ where: { id: num(req.params.id) } })
  return ok(res, { ok: true })
})

// ---- Housekeeping ----
router.get('/housekeeping', async (req, res) => {
  const scope = (await wardenUser(req)) || (await staffHostelUser(req))
  let list = await prisma.housekeepingTask.findMany({ orderBy: { id: 'asc' } })
  if (scope?.hostelId) list = list.filter((t) => String(t.hostelId) === String(scope.hostelId))
  return ok(res, [...list].sort((a, b) => b.id - a.id))
})

router.post('/housekeeping', async (req, res) => {
  if (!(await adminUser(req)) && !(await wardenUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const task = await prisma.housekeepingTask.create({
    data: {
      hostelId: num(body.hostelId),
      taskType: body.taskType,
      area: body.area,
      assignedTo: body.assignedTo,
      schedule: body.schedule,
      status: body.status || 'pending',
      inspected: !!body.inspected,
      rating: body.rating ? num(body.rating) : null,
    },
  })
  return ok(res, task, 201)
})

router.put('/housekeeping/:id', async (req, res) => {
  if (!(await roleUser(req, ['admin', ...WARDEN_ROLES, 'caretaker', 'housekeeping']))) {
    return fail(res, 'Unauthorized', 401)
  }
  const task = await prisma.housekeepingTask.findUnique({ where: { id: num(req.params.id) } })
  if (!task) return fail(res, 'Task not found', 404)
  const body = req.body || {}
  const updated = await prisma.housekeepingTask.update({
    where: { id: task.id },
    data: pick(body, ['hostelId', 'taskType', 'area', 'assignedTo', 'schedule', 'status', 'inspected', 'rating']),
  })
  await logAudit(req.user?.name || 'Staff', `Housekeeping ${body.status || 'updated'}`, 'Housekeeping', `${task.taskType} @ ${task.area}`, task.status, body.status || task.status, auditMeta(req))
  return ok(res, updated)
})

// ---- Mess module ----
router.get('/mess/feedback', async (_req, res) => {
  const list = await prisma.messFeedback.findMany({ orderBy: { id: 'asc' } })
  return ok(res, list)
})

router.get('/student/mess/feedback', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return ok(res, [])
  const list = await prisma.messFeedback.findMany({ where: { studentId: student.id }, orderBy: { id: 'asc' } })
  return ok(res, list)
})

router.post('/mess/feedback', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return fail(res, 'Student record not found', 404)
  const body = req.body || {}
  const feedback = await prisma.messFeedback.create({
    data: {
      studentId: student.id,
      date: today(),
      taste: num(body.taste),
      quantity: num(body.quantity),
      hygiene: num(body.hygiene),
      variety: num(body.variety),
      temperature: num(body.temperature),
      overall: num(body.overall),
      comment: body.comment || '',
    },
  })
  return ok(res, feedback, 201)
})

router.get('/mess/complaints', async (_req, res) => {
  const list = await prisma.messComplaint.findMany({ orderBy: { id: 'asc' } })
  return ok(res, list)
})

router.get('/student/mess/complaints', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return ok(res, [])
  const list = await prisma.messComplaint.findMany({ where: { studentId: student.id }, orderBy: { id: 'asc' } })
  return ok(res, list)
})

router.post('/mess/complaints', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return fail(res, 'Student record not found', 404)
  const body = req.body || {}
  const complaint = await prisma.messComplaint.create({
    data: {
      studentId: student.id,
      date: today(),
      subject: body.subject,
      details: body.details,
      status: 'open',
    },
  })
  return ok(res, complaint, 201)
})

router.put('/mess/complaints/:id', async (req, res) => {
  if (!(await messUser(req))) return fail(res, 'Unauthorized', 401)
  const complaint = await prisma.messComplaint.findUnique({ where: { id: num(req.params.id) } })
  if (!complaint) return fail(res, 'Complaint not found', 404)
  const body = req.body || {}
  const updated = await prisma.messComplaint.update({
    where: { id: complaint.id },
    data: { status: body.status },
  })
  await logAudit(req.user?.name || 'Mess', `Mess complaint ${body.status}`, 'Mess Complaint', String(complaint.id), complaint.status, body.status, auditMeta(req))
  return ok(res, updated)
})

router.get('/mess/inspections', async (req, res) => {
  return ok(res, await paginate(req, prisma.messInspection, { orderBy: { id: 'desc' } }))
})

router.post('/mess/inspections', async (req, res) => {
  if (!(await messUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const inspection = await prisma.messInspection.create({
    data: {
      date: body.date || today(),
      area: body.area,
      hygiene: num(body.hygiene),
      remarks: body.remarks || '',
    },
  })
  return ok(res, inspection, 201)
})

// ---- Wi-Fi ----
router.get('/wifi', async (req, res) => {
  const hostelId = req.query.hostelId
  const where = hostelId && hostelId !== 'all' ? { hostelId: num(hostelId) } : undefined
  return ok(res, paginateList(req, await prisma.wifiAccessPoint.findMany({ where })))
})

router.put('/wifi/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const ap = await prisma.wifiAccessPoint.findUnique({ where: { id: num(req.params.id) } })
  if (!ap) return fail(res, 'Access point not found', 404)
  const body = req.body || {}
  const updated = await prisma.wifiAccessPoint.update({
    where: { id: ap.id },
    data: pick(body, ['hostelId', 'accessPoint', 'status', 'downtime', 'issues']),
  })
  return ok(res, updated)
})

// ---- Medical ----
router.get('/medical', async (_req, res) => {
  const [dispensary, incidents] = await Promise.all([
    prisma.medicalDispensary.findFirst(),
    prisma.medicalIncident.findMany({ orderBy: { id: 'asc' } }),
  ])
  return ok(res, { dispensary, incidents })
})

router.put('/medical/dispensary', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const dispensary = await prisma.medicalDispensary.findFirst()
  const updated = await prisma.medicalDispensary.update({
    where: { id: dispensary.id },
    data: pick(body, ['doctor', 'nurse', 'contactno', 'ambulance']),
  })
  return ok(res, updated)
})

router.post('/medical/incidents', async (req, res) => {
  if (!(await adminUser(req)) && !(await wardenUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const incident = await prisma.medicalIncident.create({
    data: {
      studentId: num(body.studentId),
      date: body.date || today(),
      type: body.type,
      description: body.description,
      status: 'recorded',
      parentNotified: !!body.parentNotified,
    },
  })
  await addNotification('Medical incident', `${body.type} incident recorded for a student.`)
  return ok(res, incident, 201)
})

router.put('/medical/incidents/:id', async (req, res) => {
  const incident = await prisma.medicalIncident.findUnique({ where: { id: num(req.params.id) } })
  if (!incident) return fail(res, 'Incident not found', 404)
  const body = req.body || {}
  const updated = await prisma.medicalIncident.update({
    where: { id: incident.id },
    data: pick(body, ['studentId', 'date', 'type', 'description', 'status', 'parentNotified']),
  })
  return ok(res, updated)
})

// ---- Mess menu ----
router.get('/mess-menu', async (req, res) => {
  return ok(res, await paginate(req, prisma.messMenu, { orderBy: { id: 'asc' } }))
})

router.put('/mess-menu/:id', async (req, res) => {
  if (!(await messUser(req))) return fail(res, 'Unauthorized', 401)
  const item = await prisma.messMenu.findUnique({ where: { id: num(req.params.id) } })
  if (!item) return fail(res, 'Menu not found', 404)
  const body = req.body || {}
  const updated = await prisma.messMenu.update({
    where: { id: item.id },
    data: pick(body, ['day', 'breakfast', 'lunch', 'snacks', 'dinner', 'milk']),
  })
  await logAudit(req.user?.name || 'Mess', 'Updated menu', 'Mess Menu', item.day, item.lunch, updated.lunch, auditMeta(req))
  return ok(res, updated)
})

// ---- Entry / Exit ----

// ---- Attendance ----
router.get('/attendance', async (_req, res) => {
  const list = await prisma.attendance.findMany({ orderBy: { id: 'asc' } })
  return ok(res, list)
})

router.get('/warden/attendance/register', async (req, res) => {
  const user = await wardenUser(req)
  if (!user) return fail(res, 'Unauthorized', 401)
  const date = req.query.date
  const blockId = req.query.blockId
  let students = await prisma.student.findMany({ where: user.hostelId ? { hostelId: user.hostelId } : {}, orderBy: { id: 'asc' } })
  if (blockId) students = students.filter((s) => String(s.blockId) === blockId)
  const records = []
  for (const s of students) {
    const existing = date
      ? await prisma.attendance.findFirst({ where: { studentId: s.id, date } })
      : null
    records.push({
      studentId: s.id,
      regNo: s.regNo,
      name: s.name,
      roomno: s.roomno,
      status: existing ? existing.status : 'present',
    })
  }
  return ok(res, { records, date })
})

router.put('/warden/attendance/register', async (req, res) => {
  const user = await wardenUser(req)
  if (!user) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  for (const r of body.records || []) {
    const existing = await prisma.attendance.findFirst({
      where: { studentId: num(r.studentId), date: body.date },
    })
    if (existing) {
      await prisma.attendance.update({ where: { id: existing.id }, data: { status: r.status } })
    } else {
      await prisma.attendance.create({
        data: { studentId: num(r.studentId), date: body.date, status: r.status },
      })
    }
  }
  return ok(res, { ok: true })
})

router.get('/student/attendance', async (req, res) => {
  const student = await studentScope(req)
  if (!student) return ok(res, [])
  const list = await prisma.attendance.findMany({ where: { studentId: student.id }, orderBy: { id: 'asc' } })
  return ok(res, list)
})

// ---- Notices ----
router.get('/notices', async (req, res) => {
  const student = await studentScope(req)
  const list = await prisma.notice.findMany({ orderBy: { id: 'asc' } })
  if (!student) return ok(res, list)
  return ok(res, list.filter((n) => {
    if (n.audience === 'all' || n.audience === 'students') return true
    if (n.audience === 'girls') return student.gender === 'female'
    if (n.audience === 'boys') return student.gender === 'male'
    return false
  }))
})

router.post('/notices', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const notice = await prisma.notice.create({
    data: {
      title: body.title,
      body: body.body,
      category: body.category || 'General',
      audience: body.audience || 'all',
      date: today(),
      expiryDate: body.expiryDate || null,
      priority: body.priority || 'normal',
      active: true,
    },
  })
  await logAudit(req.user?.name || 'Admin', 'Created notice', 'Notice', notice.title, '-', notice.category || 'General', auditMeta(req))
  return ok(res, notice, 201)
})

router.put('/notices/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const notice = await prisma.notice.findUnique({ where: { id: num(req.params.id) } })
  if (!notice) return fail(res, 'Notice not found', 404)
  const body = req.body || {}
  const updated = await prisma.notice.update({
    where: { id: notice.id },
    data: pick(body, ['title', 'body', 'category', 'audience', 'date', 'expiryDate', 'priority', 'active']),
  })
  await logAudit(req.user?.name || 'Admin', 'Updated notice', 'Notice', notice.title, notice.active ? 'active' : 'inactive', String(updated.active), auditMeta(req))
  return ok(res, updated)
})

router.delete('/notices/:id', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const notice = await prisma.notice.findUnique({ where: { id: num(req.params.id) } })
  await prisma.notice.deleteMany({ where: { id: num(req.params.id) } })
  if (notice) await logAudit(req.user?.name || 'Admin', 'Deleted notice', 'Notice', notice.title, notice.active ? 'active' : 'inactive', 'deleted', auditMeta(req))
  return ok(res, { ok: true })
})

// ---- Committee ----
router.get('/committee', async (req, res) => {
  if (!(await adminUser(req)) && !(await wardenUser(req))) return fail(res, 'Unauthorized', 401)
  const [members, meetings] = await Promise.all([
    prisma.committeeMember.findMany({ orderBy: { id: 'asc' } }),
    prisma.committeeMeeting.findMany({ orderBy: { id: 'asc' } }),
  ])
  return ok(res, { members, meetings })
})

router.post('/committee/meetings', async (req, res) => {
  if (!(await adminUser(req)) && !(await wardenUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const meetings = await prisma.committeeMeeting.findMany()
  let nextActionId = meetings.reduce(
    (max, m) => Math.max(max, ...(m.actionItems || []).map((a) => a.id || 0)),
    0
  ) + 1
  const actionItems = (body.actionItems || []).map((a) => ({
    id: nextActionId++,
    item: a.item,
    responsible: a.responsible,
    deadline: a.deadline,
    status: 'open',
  }))
  const meeting = await prisma.committeeMeeting.create({
    data: {
      date: body.date,
      agenda: body.agenda,
      decisions: body.decisions || [],
      actionItems,
    },
  })
  return ok(res, meeting, 201)
})

router.put('/committee/meetings/:id', async (req, res) => {
  if (!(await adminUser(req)) && !(await wardenUser(req))) return fail(res, 'Unauthorized', 401)
  const meeting = await prisma.committeeMeeting.findUnique({ where: { id: num(req.params.id) } })
  if (!meeting) return fail(res, 'Meeting not found', 404)
  const body = req.body || {}
  const updated = await prisma.committeeMeeting.update({
    where: { id: meeting.id },
    data: pick(body, ['date', 'agenda', 'decisions', 'actionItems']),
  })
  return ok(res, updated)
})

// ---- Audit logs ----
router.get('/audit-logs', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const { actor, entity, action, date } = req.query
  const where = {}
  if (actor) where.actor = { contains: actor, mode: 'insensitive' }
  if (entity) where.entity = { contains: entity, mode: 'insensitive' }
  if (action) where.action = { contains: action, mode: 'insensitive' }
  if (date) where.timestamp = { contains: date }
  const list = await prisma.auditLog.findMany({ where, orderBy: { id: 'desc' } })
  return ok(res, list)
})

// ---- Parent portal ----
router.get('/parent/ward', async (req, res) => {
  const parent = await parentUser(req)
  if (!parent) return fail(res, 'Unauthorized', 401)
  const student = parent.studentId
    ? await prisma.student.findUnique({ where: { id: Number(parent.studentId) } })
    : null
  if (!student) return fail(res, 'Ward not found', 404)
  const [room, attendance, leaves, notices] = await Promise.all([
    student.roomId ? prisma.room.findUnique({ where: { id: student.roomId } }) : null,
    prisma.attendance.findMany({ where: { studentId: student.id } }),
    prisma.leave.findMany({ where: { studentId: student.id } }),
    prisma.notice.findMany(),
  ])
  return ok(res, {
    student,
    room,
    attendance,
    leaves,
    notices: notices.filter((n) => {
      if (n.audience === 'all' || n.audience === 'students') return true
      if (n.audience === 'girls') return student.gender === 'female'
      if (n.audience === 'boys') return student.gender === 'male'
      return false
    }),
  })
})

// ---- Reports ----
router.get('/admin/reports', async (_req, res) => {
  const [complaints, attendance, hostels, rooms, messFeedback] = await Promise.all([
    prisma.complaint.findMany(),
    prisma.attendance.findMany(),
    prisma.hostel.findMany({ orderBy: { id: 'asc' } }),
    prisma.room.findMany(),
    prisma.messFeedback.findMany(),
  ])
  const occ = await roomOccupancyMap()
  return ok(res, {
    totalComplaints: complaints.length,
    openComplaints: complaints.filter((c) => !c.complaintStatus || c.complaintStatus === 'In Process').length,
    attendanceSummary: {
      present: attendance.filter((a) => a.status === 'present').length,
      absent: attendance.filter((a) => a.status === 'absent').length,
      leave: attendance.filter((a) => a.status === 'leave').length,
      date: attendance[0]?.date || null,
    },
    occupancy: hostels.map((h) => {
      const hostelRooms = rooms.filter((r) => r.hostelId === h.id)
      const occupied = hostelRooms.reduce((s, r) => s + (occ.get(r.id) || []).length, 0)
      return {
        hostel: h.name,
        total: hostelRooms.length,
        occupied,
        free: Math.max(0, h.seats - occupied),
      }
    }),
    complaintsByType: countBy(complaints, (c) => c.complaintType || 'Other'),
    messRating: messFeedback.length
      ? (
          messFeedback.reduce((s, f) => s + (f.overall || 0), 0) /
          messFeedback.length
        ).toFixed(1)
      : '-',
  })
})

// ---- Settings ----
router.get('/settings', async (_req, res) => {
  const settings = await prisma.setting.findFirst()
  return ok(res, settings)
})

router.put('/settings', async (req, res) => {
  if (!(await adminUser(req))) return fail(res, 'Unauthorized', 401)
  const body = req.body || {}
  const settings = await prisma.setting.findFirst()
  const updated = await prisma.setting.update({
    where: { id: settings.id },
    data: pick(body, [
      'hostelName', 'messDinnerTime', 'wardenContact',
      'summerInTime', 'winterInTime', 'girlsInTime', 'leaveTotal',
]),
  })
  await logAudit(req.user?.name || 'Admin', 'Updated settings', 'Setting', 'System', settings.hostelName, updated.hostelName, auditMeta(req))
  return ok(res, updated)
})