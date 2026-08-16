import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pathToFileURL } from 'node:url'
import { PrismaClient } from '@prisma/client'

// ---------------------------------------------------------------------------
// Deterministic seed generation — mirrors client/src/mocks/data.js shapes so
// the API responses stay identical to the mock.
// ---------------------------------------------------------------------------

const HOSTEL_CONFIG = [
  { id: 1, code: 'AZ', name: 'Azad Bhawan', gender: 'male', type: 'freshers', campus: 'campus', address: 'Campus Road, JUIT Solan', triple: 0, double: 154, single: 21, wings: ['A Wing'] },
  { id: 2, code: 'SH', name: 'Shastri Bhawan', gender: 'male', type: 'seniors', campus: 'campus', address: 'Campus Road, JUIT Solan', triple: 1, double: 220, single: 124, wings: ['East Wing', 'West Wing'] },
  { id: 3, code: 'PM', name: 'Parmar Bhawan', gender: 'male', type: 'seniors', campus: 'campus', address: 'Campus Road, JUIT Solan', triple: 1, double: 171, single: 32, wings: ['East Wing', 'West Wing'] },
  { id: 4, code: 'GJ', name: 'Geeta Bhawan Junior Wing', gender: 'female', type: 'freshers', campus: 'campus', address: 'Campus Road, JUIT Solan', triple: 3, double: 45, single: 9, wings: ['Junior Wing'] },
  { id: 5, code: 'GS', name: 'Geeta Bhawan Senior Wing', gender: 'female', type: 'seniors', campus: 'campus', address: 'Campus Road, JUIT Solan', triple: 7, double: 130, single: 26, wings: ['Senior Wing'] },
  { id: 6, code: 'AZX', name: 'Azad Bhawan Extension', gender: 'male', type: 'seniors', campus: 'off-campus', address: 'Off-campus, JUIT Solan', triple: 0, double: 55, single: 0, wings: ['Extension Wing'], note: 'Off-campus (₹70,000/semester sharing)' },
  { id: 7, code: 'SHX', name: 'Shastri Bhawan Extension', gender: 'male', type: 'seniors', campus: 'off-campus', address: 'Off-campus, JUIT Solan', triple: 0, double: 30, single: 0, wings: ['Extension Wing'], note: 'Off-campus (₹70,000/semester sharing)' },
]

const baseUsers = [
  { id: 1, name: 'System Admin', username: 'admin', email: 'admin@hostel.com', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Rakesh Sharma', username: 'warden', email: 'warden@hostel.com', password: 'warden123', role: 'warden', hostelId: 2 },
  { id: 3, name: 'Meena Verma', username: 'meena', email: 'meena@hostel.com', password: 'warden123', role: 'warden', hostelId: 5 },
  { id: 4, name: 'Dr. S. Khatri', username: 'chief', email: 'chief@hostel.com', password: 'warden123', role: 'chief_warden' },
  { id: 5, name: 'Ramesh Kumar', username: 'caretaker', email: 'caretaker@hostel.com', password: 'caretaker123', role: 'caretaker', hostelId: 2 },
  { id: 6, name: 'Anil Mess Manager', username: 'mess', email: 'mess@hostel.com', password: 'mess123', role: 'mess_manager' },
  { id: 7, name: 'Security Guard', username: 'security', email: 'security@hostel.com', password: 'security123', role: 'security' },
  { id: 8, name: 'Housekeeping Staff', username: 'housekeeping', email: 'house@hostel.com', password: 'house123', role: 'housekeeping', hostelId: 5 },
  { id: 9, name: 'Maintenance Staff', username: 'maintenance', email: 'main@hostel.com', password: 'main123', role: 'maintenance_staff', hostelId: 5 },
  { id: 100, name: 'Parent User', username: 'parent', email: 'parent@hostel.com', password: 'parent123', role: 'parent', studentId: 40 },
]

const hostels = HOSTEL_CONFIG.map(({ triple, double, single, wings: _wings, ...rest }) => ({
  ...rest,
  seats: triple * 3 + double * 2 + single,
  roomCount: triple + double + single,
}))

let wingId = 1
const blocks = HOSTEL_CONFIG.flatMap((h) => h.wings.map((name) => ({ id: wingId++, hostelId: h.id, name })))

function generateRooms() {
  const rooms = []
  let id = 1
  for (const h of HOSTEL_CONFIG) {
    const hostelBlocks = blocks.filter((b) => b.hostelId === h.id)
    const counts = [
      { type: 'triple', count: h.triple, seater: 3 },
      { type: 'double', count: h.double, seater: 2 },
      { type: 'single', count: h.single, seater: 1 },
    ]
    let seq = 0
    for (const { type, count, seater } of counts) {
      for (let i = 0; i < count; i++) {
        seq += 1
        const floor = Math.min(5, 1 + Math.floor((seq - 1) / 40))
        const wing = hostelBlocks[(seq - 1) % hostelBlocks.length]
        rooms.push({
          id: id++,
          hostelId: h.id,
          blockId: wing.id,
          floor,
          roomNo: `${h.code}-${String(floor).padStart(2, '0')}-${String(seq).padStart(3, '0')}`,
          type,
          seater,
          status: 'available',
          occupants: [],
          fees: seater === 1 ? 87000 : seater === 2 ? 80000 : 75000,
          medicalReserved: false,
        })
      }
    }
  }
  return rooms
}

const rooms = generateRooms()

rooms.forEach((room) => {
  if (room.id % 137 === 0) room.status = 'maintenance'
  if (room.id % 211 === 0) room.status = 'blocked'
  if (room.id % 173 === 0) room.status = 'cleaning'
})
const firstSingle = rooms.find((r) => r.type === 'single')
if (firstSingle) {
  firstSingle.medicalReserved = true
  firstSingle.status = 'medical_reserved'
}

const MALE_FRESHERS = [
  ['Aarav Sharma', '231030101'], ['Vivaan Gupta', '231030102'], ['Advait Singh', '231030103'],
  ['Reyansh Kumar', '231030104'], ['Ishaan Mehta', '231030105'], ['Arjun Nair', '231030106'],
  ['Dhruv Khanna', '231030107'], ['Kabir Malhotra', '231030108'],
]
const MALE_SENIORS = [
  ['Rohan Verma', '231030001'], ['Karan Kapoor', '231030002'], ['Siddharth Joshi', '231030003'],
  ['Manav Batra', '231030004'], ['Nikhil Rao', '231030005'], ['Yash Chopra', '231030006'],
  ['Pranav Iyer', '231030007'], ['Rishabh Saxena', '231030008'], ['Aditya Bansal', '231030009'],
  ['Kunal Desai', '231030010'], ['Devansh Pillai', '231030011'], ['Harsh Vardhan', '231030012'],
  ['Varun Mehra', '231030013'], ['Tushar Aggarwal', '231030014'],
]
const FEMALE_FRESHERS = [
  ['Ananya Rao', '231030120'], ['Priya Nair', '231030121'], ['Sneha Kulkarni', '231030122'],
  ['Ritika Sharma', '231030123'], ['Tanvi Joshi', '231030124'], ['Meera Patel', '231030125'],
  ['Ishita Verma', '231030126'], ['Kavya Reddy', '231030127'],
]
const FEMALE_SENIORS = [
  ['Raavi Aggarwal', '231031009'], ['Nivi Jha', '221030106'], ['Darshika Tyagi', '231030117'],
  ['Aarya Gupta', '231030108'], ['Anvesha Vijan', '231030113'], ['Shreya Iyer', '221030107'],
  ['Pooja Malhotra', '221030108'], ['Riya Bansal', '221030109'], ['Neha Gupta', '221030110'],
  ['Simran Kaur', '221030111'], ['Divya Menon', '221030112'], ['Aditi Deshmukh', '221030113'],
  ['Swati Singh', '221030114'], ['Manisha Rao', '221030115'],
]

const APPLICANTS = {
  'Manisha Rao': 'applied',
  'Aditi Deshmukh': 'under_review',
  'Simran Kaur': 'waitlisted',
  'Kabir Malhotra': 'approved',
  'Tushar Aggarwal': 'rejected',
}

function allocateRoom(hostelId) {
  return rooms.find(
    (r) => r.hostelId === hostelId && !r.medicalReserved && (r.status === 'available' || r.status === 'partially_occupied')
  ) || null
}

function makeStudents() {
  const list = []
  let id = 10
  let boySenior = 0

  const add = (name, regNo, gender, year, course) => {
    const isFresh = year === 1
    let hostelId
    if (gender === 'male') {
      hostelId = isFresh ? 1 : boySenior++ % 2 === 0 ? 2 : 3
    } else {
      hostelId = isFresh ? 4 : 5
    }

    const applicantStatus = APPLICANTS[name]
    const housed = !applicantStatus
    let room = null
    if (housed) {
      room = allocateRoom(hostelId)
      if (room) {
        room.occupants.push(id)
        room.status = room.occupants.length >= room.seater ? 'full' : 'partially_occupied'
      }
    }

    list.push({
      id: id++,
      regNo,
      name,
      gender,
      year,
      course,
      cgpa: +(7.2 + ((id * 13) % 18) / 10).toFixed(2),
      contactno: `9${String(100000000 + id * 137).slice(0, 9)}`,
      emailid: `${name.split(' ')[0].toLowerCase()}@hostel.com`,
      roomId: room ? room.id : null,
      hostelId: room ? hostelId : null,
      blockId: room ? room.blockId : null,
      roomno: room ? room.roomNo : null,
      seater: room ? room.seater : null,
      feespm: room ? room.fees : null,
      feeStatus: 'due',
      outpassUsed: 0,
      stayfrom: room ? '2026-08-01' : null,
      guardianName: 'Mr. Guardian',
      guardianRelation: 'Guardian',
      guardianContactno: '9876500000',
      active: housed,
    })
  }

  for (const [name, regNo] of MALE_FRESHERS) add(name, regNo, 'male', 1, 'Bachelor of Technology')
  MALE_SENIORS.forEach(([name, regNo], i) => add(name, regNo, 'male', 2 + (i % 3), 'Bachelor of Technology'))
  for (const [name, regNo] of FEMALE_FRESHERS) add(name, regNo, 'female', 1, 'Bachelor of Science')
  FEMALE_SENIORS.forEach(([name, regNo], i) => add(name, regNo, 'female', 2 + (i % 3), 'Bachelor of Commerce'))

  return list
}

const students = makeStudents()

const studentUsers = students.map((s, index) => ({
  id: s.id,
  name: s.name,
  username: index === 0 ? 'student' : s.name.split(' ')[0].toLowerCase(),
  email: s.emailid,
  password: 'student123',
  role: 'student',
  regNo: s.regNo,
}))

const allUsers = [...baseUsers, ...studentUsers]

let allocationSeq = 0
function buildAllocations() {
  const list = []
  const add = (student, status, extra = {}) => {
    allocationSeq += 1
    const room = student.roomId ? rooms.find((r) => r.id === student.roomId) : null
    list.push({
      id: allocationSeq,
      studentId: student.id,
      studentName: student.name,
      regNo: student.regNo,
      gender: student.gender,
      year: student.year,
      hostelPrefs: student.hostelId ? [student.hostelId] : [],
      roomType: null,
      status,
      hostelId: student.hostelId,
      roomId: room ? room.id : null,
      roomNo: room ? room.roomNo : null,
      bedNo: room ? room.occupants.indexOf(student.id) + 1 : null,
      appliedDate: '2026-08-05',
      updatedDate: '2026-08-08',
      history: [{ status: 'applied', date: '2026-08-05', by: student.name, note: 'Application submitted' }],
      ...extra,
    })
  }

  const housed = students.filter((s) => s.active)
  for (const student of housed) add(student, 'occupied')

  const byName = (name) => students.find((s) => s.name === name)
  add(byName('Manisha Rao'), 'applied', { hostelPrefs: [5], roomType: 'single' })
  add(byName('Aditi Deshmukh'), 'under_review', { hostelPrefs: [5, 4], roomType: 'double' })
  add(byName('Simran Kaur'), 'waitlisted', { hostelPrefs: [5], roomType: 'double' })
  add(byName('Kabir Malhotra'), 'approved', { hostelPrefs: [1], roomType: 'double' })
  add(byName('Tushar Aggarwal'), 'rejected', { hostelPrefs: [2], roomType: 'single' })

  return list
}

const allocations = buildAllocations()

const complaints = [
  { id: 1, complainNumber: 473906789, studentId: 40, studentName: 'Raavi Aggarwal', complaintType: 'Electrical', complaintDetails: 'LED light not working in my room', complaintDoc: null, complaintStatus: 'In Process', registrationDate: '2026-08-12 09:06:16' },
  { id: 2, complainNumber: 296166607, studentId: 41, studentName: 'Nivi Jha', complaintType: 'Plumbing', complaintDetails: 'Tap leakage in washroom', complaintDoc: null, complaintStatus: 'In Process', registrationDate: '2026-08-10 11:38:48' },
  { id: 3, complainNumber: 950749466, studentId: 43, studentName: 'Aarya Gupta', complaintType: 'Mess', complaintDetails: 'Food quality not consistent', complaintDoc: null, complaintStatus: 'Closed', registrationDate: '2026-08-04 18:22:23' },
  { id: 4, complainNumber: 740539183, studentId: 44, studentName: 'Anvesha Vijan', complaintType: 'Wi-Fi', complaintDetails: 'Wi-Fi down in my wing since morning', complaintDoc: null, complaintStatus: 'New', registrationDate: '2026-08-13 05:19:17' },
  { id: 5, complainNumber: 316012785, studentId: 42, studentName: 'Darshika Tyagi', complaintType: 'Room', complaintDetails: 'Fan not working', complaintDoc: null, complaintStatus: 'Closed', registrationDate: '2026-08-02 11:39:03' },
  { id: 6, complainNumber: 883920114, studentId: 33, studentName: 'Ananya Rao', complaintType: 'Housekeeping', complaintDetails: 'Room not cleaned today', complaintDoc: null, complaintStatus: 'New', registrationDate: '2026-08-14 08:15:00' },
]

const complaintHistory = [
  { id: 1, complaintId: 1, complaintStatus: 'In Process', remark: 'Electrician assigned.', postingDate: '2026-08-12 12:00:00' },
  { id: 2, complaintId: 3, complaintStatus: 'In Process', remark: 'Mess committee notified.', postingDate: '2026-08-05 09:30:00' },
  { id: 3, complaintId: 3, complaintStatus: 'Closed', remark: 'Resolved after feedback.', postingDate: '2026-08-07 12:00:00' },
  { id: 4, complaintId: 5, complaintStatus: 'In Process', remark: 'Technician assigned.', postingDate: '2026-08-03 08:15:00' },
]

const maintenanceTickets = [
  { id: 1, studentId: 40, studentName: 'Raavi Aggarwal', hostelId: 5, roomNo: 'GS-03-001', category: 'Electrical', subcategory: 'Fan not working', description: 'Ceiling fan wobbles and makes noise', priority: 'medium', status: 'reported', assignedTo: 'Technician T1', expectedDate: '2026-08-16', resolvedDate: null, createdDate: '2026-08-14', rating: null, remarks: '' },
  { id: 2, studentId: 41, studentName: 'Nivi Jha', hostelId: 5, roomNo: 'GS-04-010', category: 'Plumbing', subcategory: 'Tap leakage', description: 'Wash basin tap leaks continuously', priority: 'high', status: 'in_progress', assignedTo: 'Plumber P1', expectedDate: '2026-08-15', resolvedDate: null, createdDate: '2026-08-12', rating: null, remarks: 'Spare part ordered' },
  { id: 3, studentId: 43, studentName: 'Aarya Gupta', hostelId: 5, roomNo: 'GS-02-020', category: 'Room', subcategory: 'Door problem', description: 'Main door latch broken', priority: 'low', status: 'resolved', assignedTo: 'Carpenter C1', expectedDate: '2026-08-10', resolvedDate: '2026-08-11', createdDate: '2026-08-08', rating: 4, remarks: 'Replaced latch' },
]

const inventory = [
  { id: 1, roomId: 1, hostelId: 5, item: 'Box bed', quantity: 2, condition: 'Good', status: 'new', assignedTo: 'Student' },
  { id: 2, roomId: 1, hostelId: 5, item: 'Mattress', quantity: 2, condition: 'Good', status: 'good', assignedTo: 'Student' },
  { id: 3, roomId: 1, hostelId: 5, item: 'Study table', quantity: 2, condition: 'Good', status: 'good', assignedTo: 'Student' },
  { id: 4, roomId: 1, hostelId: 5, item: 'Chair', quantity: 2, condition: 'Good', status: 'good', assignedTo: 'Student' },
  { id: 5, roomId: 1, hostelId: 5, item: 'Steel almirah', quantity: 2, condition: 'Good', status: 'good', assignedTo: 'Student' },
  { id: 6, roomId: 1, hostelId: 5, item: 'Fan', quantity: 1, condition: 'Good', status: 'good', assignedTo: 'Room' },
  { id: 7, roomId: 1, hostelId: 5, item: 'Tube light', quantity: 2, condition: 'Good', status: 'good', assignedTo: 'Room' },
  { id: 8, roomId: 1, hostelId: 5, item: 'Curtains', quantity: 1, condition: 'Good', status: 'good', assignedTo: 'Room' },
  { id: 9, roomId: 100, hostelId: 2, item: 'Chair', quantity: 2, condition: 'Damaged', status: 'under_repair', assignedTo: 'Student' },
]

const housekeeping = [
  { id: 1, hostelId: 5, taskType: 'Room cleaning', area: 'GS-03-001', assignedTo: 'Staff H1', schedule: '2026-08-15', status: 'pending', inspected: false, rating: null },
  { id: 2, hostelId: 5, taskType: 'Corridor cleaning', area: 'Senior Wing 3rd floor', assignedTo: 'Staff H2', schedule: '2026-08-15', status: 'in_progress', inspected: false, rating: null },
  { id: 3, hostelId: 2, taskType: 'Bathroom cleaning', area: 'East Wing washroom', assignedTo: 'Staff H1', schedule: '2026-08-14', status: 'completed', inspected: true, rating: 4 },
  { id: 4, hostelId: 1, taskType: 'Common room cleaning', area: 'A Wing lounge', assignedTo: 'Staff H3', schedule: '2026-08-16', status: 'pending', inspected: false, rating: null },
]

const messMenu = [
  { id: 1, day: 'Monday', breakfast: 'Poha', lunch: 'Rajma Rice', snacks: 'Tea & Biscuits', dinner: 'Chicken Curry', milk: 'Milk' },
  { id: 2, day: 'Tuesday', breakfast: 'Aloo Paratha', lunch: 'Dal Tadka', snacks: 'Samosa', dinner: 'Veg Biryani', milk: 'Milk' },
  { id: 3, day: 'Wednesday', breakfast: 'Upma', lunch: 'Chole Rice', snacks: 'Fruit', dinner: 'Butter Paneer', milk: 'Milk' },
  { id: 4, day: 'Thursday', breakfast: 'Idli Sambhar', lunch: 'Mix Veg', snacks: 'Vada', dinner: 'Egg Curry', milk: 'Milk' },
  { id: 5, day: 'Friday', breakfast: 'Puri Sabzi', lunch: 'Kadhi Rice', snacks: 'Tea & Biscuits', dinner: 'Palak Paneer', milk: 'Milk' },
  { id: 6, day: 'Saturday', breakfast: 'Bread Omelette', lunch: 'Veg Pulao', snacks: 'Chaat', dinner: 'Special Thali', milk: 'Milk' },
  { id: 7, day: 'Sunday', breakfast: 'Chole Bhature', lunch: 'Fried Rice', snacks: 'Ice cream', dinner: 'Curd Rice', milk: 'Milk' },
]

const messFeedback = [
  { id: 1, studentId: 40, date: '2026-08-13', taste: 4, quantity: 4, hygiene: 4, variety: 3, temperature: 4, overall: 4, comment: 'Good, keep it up' },
  { id: 2, studentId: 12, date: '2026-08-13', taste: 3, quantity: 2, hygiene: 3, variety: 3, temperature: 3, overall: 3, comment: 'Dinner quantity less' },
]

const messComplaints = [
  { id: 1, studentId: 43, date: '2026-08-11', subject: 'Food quality', details: 'Paneer tasted stale', status: 'resolved' },
]

const messInspections = [
  { id: 1, date: '2026-08-10', area: 'Kitchen', hygiene: 5, remarks: 'All clean' },
  { id: 2, date: '2026-08-06', area: 'Dining Hall', hygiene: 4, remarks: 'Minor floor stains' },
]

const activeStudents = students.filter((s) => s.active)

const fees = activeStudents.map((s, index) => ({
  id: index + 1,
  studentId: s.id,
  studentName: s.name,
  amount: s.feespm,
  dueDate: '2026-09-01',
  paidDate: index % 3 === 0 ? '2026-08-10' : null,
  status: index % 3 === 0 ? 'paid' : index % 3 === 1 ? 'due' : 'overdue',
}))

const attendance = activeStudents.slice(0, 20).map((s, index) => ({
  id: index + 1,
  studentId: s.id,
  date: '2026-08-14',
  status: index % 5 === 2 ? 'absent' : index % 7 === 3 ? 'leave' : 'present',
}))

const entryExit = [
  { id: 1, studentId: 10, date: '2026-08-14', time: '18:05', type: 'exit', gate: 'Main Gate', status: 'normal', lateMinutes: 0, linkedOutpassId: 1 },
  { id: 2, studentId: 10, date: '2026-08-14', time: '20:12', type: 'entry', gate: 'Main Gate', status: 'normal', lateMinutes: 0, linkedOutpassId: null },
  { id: 3, studentId: 40, date: '2026-08-14', time: '21:45', type: 'entry', gate: 'Girls Hostel Gate', status: 'late', lateMinutes: 15, linkedOutpassId: null },
  { id: 4, studentId: 41, date: '2026-08-14', time: '22:20', type: 'entry', gate: 'Girls Hostel Gate', status: 'violation', lateMinutes: 50, linkedOutpassId: null },
]

const outpasses = [
  { id: 1, studentId: 10, studentName: 'Aarav Sharma', passNo: 1, destination: 'Solan', reason: 'Family visit', departure: '2026-08-10 09:00', expectedReturn: '2026-08-10 18:00', actualReturn: '2026-08-10 17:45', parentApproved: true, wardenApproved: true, status: 'completed' },
  { id: 2, studentId: 40, studentName: 'Raavi Aggarwal', passNo: 1, destination: 'Shimla', reason: 'Weekend trip', departure: '2026-08-14 10:00', expectedReturn: '2026-08-14 20:00', actualReturn: null, parentApproved: true, wardenApproved: true, status: 'active' },
]

for (const s of students) {
  s.outpassUsed = outpasses.filter((o) => o.studentId === s.id && ['approved', 'active', 'completed'].includes(o.status)).length
}

const leaves = [
  { id: 1, studentId: 40, studentName: 'Raavi Aggarwal', from: '2026-08-20', to: '2026-08-22', reason: 'Family function', destination: 'Shimla', parentApproved: false, status: 'pending' },
  { id: 2, studentId: 43, studentName: 'Aarya Gupta', from: '2026-08-18', to: '2026-08-19', reason: 'Medical appointment', destination: 'Solan', parentApproved: true, status: 'approved' },
  { id: 3, studentId: 44, studentName: 'Anvesha Vijan', from: '2026-08-15', to: '2026-08-15', reason: 'Personal work', destination: 'Home', parentApproved: true, status: 'rejected' },
]

const visitors = [
  { id: 1, studentId: 40, studentName: 'Raavi Aggarwal', visitorName: 'Raj Aggarwal', relation: 'Brother', date: '2026-08-12', inTime: '14:00', outTime: '16:30', purpose: 'Visit', status: 'checked-in' },
  { id: 2, studentId: 41, studentName: 'Nivi Jha', visitorName: 'Suman Jha', relation: 'Mother', date: '2026-08-09', inTime: '11:00', outTime: null, purpose: 'Visit', status: 'pending' },
]

const wifi = [
  { id: 1, hostelId: 2, accessPoint: 'SH-AP1', status: 'online', downtime: 0, issues: [] },
  { id: 2, hostelId: 5, accessPoint: 'GS-AP1', status: 'degraded', downtime: 45, issues: ['Slow bandwidth'] },
  { id: 3, hostelId: 5, accessPoint: 'GS-AP2', status: 'offline', downtime: 120, issues: ['Down since morning'] },
]

const medicalIncidents = [
  { id: 1, studentId: 13, date: '2026-08-12', type: 'Medical', description: 'High fever, taken to dispensary', status: 'recorded', parentNotified: true },
]

const committeeMembers = [
  { id: 1, name: 'Chief Warden', role: 'Chairperson' },
  { id: 2, name: 'Mess In-charge', role: 'Member' },
  { id: 3, name: 'Student Representative', role: 'Member' },
  { id: 4, name: 'Caretaker', role: 'Member' },
]

const committeeMeetings = [
  { id: 1, date: '2026-08-20', agenda: 'Mess menu review, maintenance backlog', decisions: ['Weekly menu to be displayed'], actionItems: [{ id: 1, item: 'Display menu', responsible: 'Mess In-charge', deadline: '2026-08-18', status: 'open' }] },
]

const auditLogs = [
  { id: 1, actor: 'Rakesh Sharma', action: 'Allocated room', entity: 'Allocation', target: 'Kabir Malhotra', before: 'Approved', after: 'Allocated', timestamp: '2026-08-12 10:42:00' },
  { id: 2, actor: 'System Admin', action: 'Updated hostel', entity: 'Hostel', target: 'Shastri Bhawan', before: 'capacity 567', after: 'capacity 567', timestamp: '2026-08-11 09:00:00' },
]

const notices = [
  { id: 1, title: 'Mess timings changed', body: 'Dinner will now be served until 8:30 PM.', category: 'Mess', audience: 'all', date: '2026-08-13', expiryDate: null, priority: 'normal', active: true },
  { id: 2, title: 'Hostel fee deadline', body: 'Last date to pay hostel fees is 1st September.', category: 'Fees', audience: 'students', date: '2026-08-10', expiryDate: null, priority: 'high', active: true },
  { id: 3, title: 'Girls hostel in-time', body: 'All girl hostellers must be inside by 9:30 PM (winter 7:30 PM).', category: 'Timings', audience: 'girls', date: '2026-08-08', expiryDate: null, priority: 'normal', active: true },
]

const notifications = [
  { id: 1, title: 'New maintenance ticket', description: 'Raavi Aggarwal reported a Fan issue (GS-03-001).', read: false, date: '2026-08-14' },
  { id: 2, title: 'Leave request', description: 'Raavi Aggarwal requested leave (Aug 20-22).', read: false, date: '2026-08-13' },
  { id: 3, title: 'Application approved', description: 'Kabir Malhotra is awaiting room allocation.', read: true, date: '2026-08-12' },
]

const settings = {
  hostelName: 'JUIT Hostels',
  feeDeadline: '2026-09-01',
  maintenanceDay: 'Sunday',
  messDinnerTime: '8:30 PM',
  wardenContact: '01792-123456',
  summerInTime: '8:00 PM',
  winterInTime: '7:30 PM',
  girlsInTime: '9:30 PM',
  outpassTotal: 12,
}

// ---------------------------------------------------------------------------

const SEQUENCE_MODELS = [
  'User', 'Hostel', 'Block', 'Room', 'Student', 'Allocation', 'Complaint',
  'ComplaintAction', 'MaintenanceTicket', 'InventoryItem', 'HousekeepingTask',
  'Fee', 'Attendance', 'EntryExit', 'Outpass', 'Notice', 'Leave', 'Visitor',
  'MessMenu', 'MessFeedback', 'MessComplaint', 'MessInspection',
  'WifiAccessPoint', 'MedicalDispensary', 'MedicalIncident', 'CommitteeMember',
  'CommitteeMeeting', 'AuditLog', 'Notification', 'Setting',
]

export async function resetSequences(prisma) {
  for (const model of SEQUENCE_MODELS) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${model}"', 'id'), COALESCE((SELECT MAX(id) FROM "${model}"), 1))`
    )
  }
}

export async function seedDatabase(prisma) {
  const hash = (pw) => bcrypt.hashSync(pw, 4)

  await prisma.$transaction([
    prisma.complaintAction.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.allocation.deleteMany(),
    prisma.maintenanceTicket.deleteMany(),
    prisma.fee.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.entryExit.deleteMany(),
    prisma.outpass.deleteMany(),
    prisma.leave.deleteMany(),
    prisma.visitor.deleteMany(),
    prisma.messFeedback.deleteMany(),
    prisma.messComplaint.deleteMany(),
    prisma.medicalIncident.deleteMany(),
    prisma.room.deleteMany(),
    prisma.block.deleteMany(),
    prisma.student.deleteMany(),
    prisma.hostel.deleteMany(),
    prisma.user.deleteMany(),
    prisma.messMenu.deleteMany(),
    prisma.messInspection.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.housekeepingTask.deleteMany(),
    prisma.wifiAccessPoint.deleteMany(),
    prisma.medicalDispensary.deleteMany(),
    prisma.committeeMember.deleteMany(),
    prisma.committeeMeeting.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.setting.deleteMany(),
  ])

  await prisma.hostel.createMany({ data: hostels })
  await prisma.block.createMany({ data: blocks })
  await prisma.room.createMany({
    data: rooms.map(({ occupants: _occupants, ...room }) => room),
  })
  await prisma.user.createMany({
    data: allUsers.map(({ password, ...u }) => ({ ...u, password: hash(password) })),
  })
  await prisma.student.createMany({ data: students })
  await prisma.allocation.createMany({ data: allocations })
  await prisma.complaint.createMany({ data: complaints })
  await prisma.complaintAction.createMany({ data: complaintHistory })
  await prisma.maintenanceTicket.createMany({ data: maintenanceTickets })
  await prisma.inventoryItem.createMany({ data: inventory })
  await prisma.housekeepingTask.createMany({ data: housekeeping })
  await prisma.messMenu.createMany({ data: messMenu })
  await prisma.messFeedback.createMany({ data: messFeedback })
  await prisma.messComplaint.createMany({ data: messComplaints })
  await prisma.messInspection.createMany({ data: messInspections })
  await prisma.fee.createMany({ data: fees })
  await prisma.attendance.createMany({ data: attendance })
  await prisma.entryExit.createMany({ data: entryExit })
  await prisma.outpass.createMany({ data: outpasses })
  await prisma.leave.createMany({ data: leaves })
  await prisma.visitor.createMany({ data: visitors })
  await prisma.wifiAccessPoint.createMany({ data: wifi })
  await prisma.medicalDispensary.create({ data: { doctor: 'Dr. Kavita Nair', nurse: 'Nurse Renu', contactno: '01792-227700', ambulance: '01792-227701' } })
  await prisma.medicalIncident.createMany({ data: medicalIncidents })
  await prisma.committeeMember.createMany({ data: committeeMembers })
  await prisma.committeeMeeting.createMany({ data: committeeMeetings })
  await prisma.auditLog.createMany({ data: auditLogs })
  await prisma.notice.createMany({ data: notices })
  await prisma.notification.createMany({ data: notifications })
  await prisma.setting.create({ data: settings })

  await resetSequences(prisma)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient()
  seedDatabase(prisma)
    .then(() => {
      console.log(`Seeded: ${hostels.length} hostels, ${rooms.length} rooms, ${students.length} students, ${allUsers.length} users, ${allocations.length} allocations`)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}