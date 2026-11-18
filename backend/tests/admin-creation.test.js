import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { prisma } from '../src/prisma.js'
import { seedDatabase } from '../prisma/seed.js'
import { createApp } from '../src/app.js'
import { signToken } from '../src/auth.js'

const app = createApp()

const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` })

beforeEach(async () => {
  await seedDatabase(prisma)
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Admin creation workflows', () => {
  let adminUser

  beforeEach(async () => {
    adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
  })

  describe('Hostel creation', () => {
    it('admin creates hostel successfully', async () => {
      const res = await request(app)
        .post('/api/hostels')
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))
        .send({
          name: 'Test Hostel',
          code: 'THTEST001',
          gender: 'male',
          type: 'freshers',
          campus: 'campus',
          address: 'Test Address',
          seats: 100,
          roomCount: 10,
        })

      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Test Hostel')
      expect(res.body.code).toBe('THTEST001')
      expect(res.body.gender).toBe('male')

      const persisted = await prisma.hostel.findUnique({ where: { id: res.body.id } })
      expect(persisted).toBeTruthy()
      expect(persisted.name).toBe('Test Hostel')
    })

    it('rejects duplicate hostel code', async () => {
      const hostel1 = await request(app)
        .post('/api/hostels')
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))
        .send({
          name: 'First Hostel',
          code: 'SAMECODE',
          gender: 'male',
          type: 'freshers',
          campus: 'campus',
          address: 'Addr1',
          seats: 100,
          roomCount: 10,
        })

      expect(hostel1.status).toBe(201)

      const res = await request(app)
        .post('/api/hostels')
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))
        .send({
          name: 'Second Hostel',
          code: 'SAMECODE',
          gender: 'female',
          type: 'seniors',
          campus: 'campus',
          address: 'Addr2',
          seats: 50,
          roomCount: 5,
        })

      expect(res.status).toBe(409)
      expect(res.body.message).toMatch(/code|unique|already exists/i)
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/hostels')
        .send({ name: 'Test', code: 'T', gender: 'male', type: 'freshers', campus: 'campus' })

      expect(res.status).toBe(401)
    })

    it('rejects token for non-existent user', async () => {
      const res = await request(app)
        .post('/api/hostels')
        .set(auth({ id: 99999, role: 'admin', tokenVersion: 0 }))
        .send({ name: 'Test', code: 'T', gender: 'male', type: 'freshers', campus: 'campus' })

      expect(res.status).toBe(401)
    })
  })

  describe('Block creation', () => {
    it('admin creates block successfully', async () => {
      const hostel = await prisma.hostel.findFirst()
      const res = await request(app)
        .post('/api/blocks')
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))
        .send({ name: 'Test Wing', hostelId: hostel.id })

      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Test Wing')
      expect(res.body.hostelId).toBe(hostel.id)

      const persisted = await prisma.block.findUnique({ where: { id: res.body.id } })
      expect(persisted).toBeTruthy()
    })

    it('rejects block with invalid hostel ID', async () => {
      const res = await request(app)
        .post('/api/blocks')
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))
        .send({ name: 'Test Wing', hostelId: 99999 })

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/hostel not found/i)
    })

    it('rejects unauthenticated request', async () => {
      const hostel = await prisma.hostel.findFirst()
      const res = await request(app)
        .post('/api/blocks')
        .send({ name: 'Test Wing', hostelId: hostel.id })

      expect(res.status).toBe(401)
    })
  })

  describe('Room creation', () => {
    it('admin creates room successfully', async () => {
      const block = await prisma.block.findFirst()
      const hostel = await prisma.hostel.findUnique({ where: { id: block.hostelId } })
      const res = await request(app)
        .post('/api/rooms')
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))
        .send({
          hostelId: hostel.id,
          blockId: block.id,
          floor: 1,
          roomNo: 'T-01-001',
          type: 'single',
          seater: 1,
        })

      expect(res.status).toBe(201)
      expect(res.body.roomNo).toBe('T-01-001')
      expect(res.body.type).toBe('single')
      expect(res.body.status).toBe('available')

      const persisted = await prisma.room.findUnique({ where: { id: res.body.id } })
      expect(persisted).toBeTruthy()
    })

    it('rejects room with invalid block ID', async () => {
      const hostel = await prisma.hostel.findFirst()
      const res = await request(app)
        .post('/api/rooms')
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))
        .send({
          hostelId: hostel.id,
          blockId: 99999,
          floor: 1,
          roomNo: 'T-01-001',
          type: 'single',
          seater: 1,
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/block not found/i)
    })

    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ hostelId: 1, blockId: 1, floor: 1, roomNo: 'T', type: 'single', seater: 1 })

      expect(res.status).toBe(401)
    })

    it('rejects room with block not belonging to hostel', async () => {
      const hostel1 = await prisma.hostel.findFirst()
      const hostel2 = await prisma.hostel.findFirst({ where: { id: { not: hostel1.id } } })
      const block2 = await prisma.block.findFirst({ where: { hostelId: hostel2.id } })

      const res = await request(app)
        .post('/api/rooms')
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))
        .send({
          hostelId: hostel1.id,
          blockId: block2.id,
          floor: 1,
          roomNo: 'T-01-001',
          type: 'single',
          seater: 1,
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/block does not belong/i)
    })
  })

  describe('Warden room scoping', () => {
    it('warden sees only rooms from their assigned hostel', async () => {
      const warden = await prisma.user.findUnique({ where: { username: 'warden' } })
      const meena = await prisma.user.findUnique({ where: { username: 'meena' } })

      const wardenResp = await request(app)
        .get('/api/rooms')
        .set(auth({ id: warden.id, role: 'warden', tokenVersion: warden.tokenVersion, hostelId: warden.hostelId }))

      const meenaResp = await request(app)
        .get('/api/rooms')
        .set(auth({ id: meena.id, role: 'warden', tokenVersion: meena.tokenVersion, hostelId: meena.hostelId }))

      const wardenRooms = wardenResp.body.items || wardenResp.body
      const meenaRooms = meenaResp.body.items || meenaResp.body

      expect(wardenRooms.length).toBeGreaterThan(0)
      expect(meenaRooms.length).toBeGreaterThan(0)

      for (const r of wardenRooms) {
        expect(r.hostelId).toBe(warden.hostelId)
      }
      for (const r of meenaRooms) {
        expect(r.hostelId).toBe(meena.hostelId)
      }

      const wardenHostelIds = new Set(wardenRooms.map(r => r.hostelId))
      const meenaHostelIds = new Set(meenaRooms.map(r => r.hostelId))
      expect(wardenHostelIds.size).toBe(1)
      expect(meenaHostelIds.size).toBe(1)
      expect(wardenHostelIds).not.toEqual(meenaHostelIds)
    })

    it('warden cannot access room detail from another hostel', async () => {
      const warden = await prisma.user.findUnique({ where: { username: 'warden' } })
      const meena = await prisma.user.findUnique({ where: { username: 'meena' } })

      const otherHostelRoom = await prisma.room.findFirst({
        where: { hostelId: meena.hostelId }
      })

      const res = await request(app)
        .get(`/api/rooms/${otherHostelRoom.id}`)
        .set(auth({ id: warden.id, role: 'warden', tokenVersion: warden.tokenVersion, hostelId: warden.hostelId }))

      expect(res.status).toBe(403)
    })
  })

  describe('Room detail authorization', () => {
    it('admin sees occupants and inventory', async () => {
      const room = await prisma.room.findFirst({ where: { id: 1 } })
      const res = await request(app)
        .get(`/api/rooms/${room.id}`)
        .set(auth({ id: adminUser.id, role: 'admin', tokenVersion: adminUser.tokenVersion }))

      expect(res.status).toBe(200)
      expect(res.body.occupants).toBeDefined()
      expect(Array.isArray(res.body.occupants)).toBe(true)
      expect(res.body.inventory).toBeDefined()
      expect(Array.isArray(res.body.inventory)).toBe(true)
    })

    it('warden sees occupants but not inventory', async () => {
      const warden = await prisma.user.findUnique({ where: { username: 'warden' } })
      const room = await prisma.room.findFirst({ where: { hostelId: warden.hostelId } })

      const res = await request(app)
        .get(`/api/rooms/${room.id}`)
        .set(auth({ id: warden.id, role: 'warden', tokenVersion: warden.tokenVersion, hostelId: warden.hostelId }))

      expect(res.status).toBe(200)
      expect(res.body.occupants).toBeDefined()
      expect(Array.isArray(res.body.occupants)).toBe(true)
      expect(res.body.inventory).toBeUndefined()
    })

    it('student sees basic room info but not occupants or inventory', async () => {
      const student = await prisma.user.findUnique({ where: { username: 'student' } })
      const stu = await prisma.student.findUnique({ where: { regNo: student.regNo } })
      const room = await prisma.room.findUnique({ where: { id: stu.roomId } })

      const res = await request(app)
        .get(`/api/rooms/${room.id}`)
        .set(auth({ id: student.id, role: 'student', tokenVersion: student.tokenVersion, regNo: student.regNo }))

      expect(res.status).toBe(200)
      expect(res.body.id).toBe(room.id)
      expect(res.body.occupants).toBeUndefined()
      expect(res.body.inventory).toBeUndefined()
    })

    it('rejects unauthenticated request', async () => {
      const room = await prisma.room.findFirst()
      const res = await request(app).get(`/api/rooms/${room.id}`)
      expect(res.status).toBe(401)
    })

    it('rejects unauthorized role (caretaker)', async () => {
      const caretaker = await prisma.user.findUnique({ where: { username: 'caretaker' } })
      const room = await prisma.room.findFirst()
      const res = await request(app)
        .get(`/api/rooms/${room.id}`)
        .set(auth({ id: caretaker.id, role: 'caretaker', tokenVersion: caretaker.tokenVersion, hostelId: caretaker.hostelId }))
      expect(res.status).toBe(403)
    })
  })
})