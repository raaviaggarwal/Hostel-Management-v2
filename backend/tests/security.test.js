import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/prisma.js'
import { signToken } from '../src/auth.js'
import { createApp } from '../src/app.js'
import { seedDatabase } from '../prisma/seed.js'

const app = createApp()

const admin = { id: 1, role: 'admin', tokenVersion: 0, mustChangePassword: false }
const warden = { id: 2, role: 'warden', tokenVersion: 0, hostelId: 2, mustChangePassword: false }
const wardenMustChange = { id: 3, role: 'warden', tokenVersion: 0, hostelId: 2, mustChangePassword: true }
const student = { id: 4, role: 'student', tokenVersion: 0, regNo: 'STU-4', mustChangePassword: false }
const studentMustChange = { id: 5, role: 'student', tokenVersion: 0, regNo: 'STU-5', mustChangePassword: true }

const allUsers = [admin, warden, wardenMustChange, student, studentMustChange]

const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` })

const createdRecords = {
  users: [],
  students: [],
  wardens: [],
}

async function cleanup() {
  for (const id of createdRecords.wardens) {
    try { await prisma.user.delete({ where: { id } }) } catch {}
  }
  for (const id of createdRecords.students) {
    try { await prisma.student.delete({ where: { id } }) } catch {}
  }
  for (const id of createdRecords.users) {
    try { await prisma.user.delete({ where: { id } }) } catch {}
  }
  createdRecords.users = []
  createdRecords.students = []
  createdRecords.wardens = []
}

beforeAll(async () => {
  await cleanup()
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

beforeEach(async () => {
  await cleanup()
  await seedDatabase(prisma)
})

describe('Security Hardening - Integration Tests', () => {
  describe('Warden creation', () => {
    it('creates warden with cryptographically secure temp password', async () => {
      const response = await request(app)
        .post('/api/wardens')
        .set(auth(admin))
        .send({ name: 'New Warden', email: 'warden@test.com', hostelId: 2 })

      expect(response.status).toBe(201)
      expect(response.body.tempPassword).toBeDefined()
      expect(response.body.tempPassword.length).toBeGreaterThanOrEqual(12)
      expect(response.body.username).toMatch(/^warden_[A-Za-z0-9_-]+$/)
      expect(response.body.mustChangePassword).toBe(true)
      expect(response.body.role).toBe('warden')
      expect(response.body.password).toBeUndefined()

      const createdUser = await prisma.user.findUnique({ where: { id: response.body.id } })
      expect(createdUser).toBeTruthy()
      expect(createdUser.role).toBe('warden')
      expect(createdUser.mustChangePassword).toBe(true)
      expect(createdUser.hostelId).toBe(2)
      createdRecords.users.push(createdUser.id)
    })

    it('rejects invalid hostelId', async () => {
      const response = await request(app)
        .post('/api/wardens')
        .set(auth(admin))
        .send({ name: 'New Warden', email: 'warden@test.com', hostelId: 999 })

      expect(response.status).toBe(404)
    })

    it('rejects invalid blockId', async () => {
      const response = await request(app)
        .post('/api/wardens')
        .set(auth(admin))
        .send({ name: 'New Warden', email: 'warden@test.com', hostelId: 2, blockId: 999 })

      expect(response.status).toBe(404)
    })

    it('rejects blockId that does not belong to hostelId', async () => {
      const response = await request(app)
        .post('/api/wardens')
        .set(auth(admin))
        .send({ name: 'New Warden', email: 'warden@test.com', hostelId: 2, blockId: 5 })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('does not belong')
    })

    it('allows warden creation without hostel/block (chief warden)', async () => {
      const response = await request(app)
        .post('/api/wardens')
        .set(auth(admin))
        .send({ name: 'Chief Warden', email: 'chief@test.com' })

      expect(response.status).toBe(201)
      expect(response.body.hostelId).toBeNull()
      expect(response.body.blockId).toBeNull()
      expect(response.body.tempPassword).toBeDefined()
      expect(response.body.mustChangePassword).toBe(true)
      expect(response.body.role).toBe('warden')
      createdRecords.users.push(response.body.id)
    })
  })

  describe('Password change enforcement', () => {
    it('allows access to /auth/me when mustChangePassword=true', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: 'test@student.com',
          username: 'test_student',
          password: bcrypt.hashSync('password123', 10),
          role: 'student',
          regNo: 'TEST-001',
          mustChangePassword: true,
        },
      })
      createdRecords.users.push(user.id)

      const token = signToken({ id: user.id, role: 'student', tokenVersion: 0, mustChangePassword: true, regNo: 'TEST-001' })
      const response = await request(app)
        .get('/api/auth/me')
        .set({ Authorization: `Bearer ${token}` })

      expect(response.status).toBe(200)
    })

    it('allows access to /auth/change-password when mustChangePassword=true', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: 'test@student.com',
          username: 'test_student',
          password: bcrypt.hashSync('oldpass', 10),
          role: 'student',
          regNo: 'TEST-002',
          mustChangePassword: true,
        },
      })
      createdRecords.users.push(user.id)

      const token = signToken({ id: user.id, role: 'student', tokenVersion: 0, mustChangePassword: true, regNo: 'TEST-002' })
      const response = await request(app)
        .post('/api/auth/change-password')
        .set({ Authorization: `Bearer ${token}` })
        .send({ currentPassword: 'oldpass', newPassword: 'newpassword123' })

      expect(response.status).not.toBe(403)
    })

    it('allows access to /auth/logout when mustChangePassword=true', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: 'test@student.com',
          username: 'test_student',
          password: bcrypt.hashSync('password123', 10),
          role: 'student',
          regNo: 'TEST-003',
          mustChangePassword: true,
        },
      })
      createdRecords.users.push(user.id)

      const token = signToken({ id: user.id, role: 'student', tokenVersion: 0, mustChangePassword: true, regNo: 'TEST-003' })
      const response = await request(app)
        .post('/api/auth/logout')
        .set({ Authorization: `Bearer ${token}` })

      expect(response.status).toBe(200)
    })

    it('blocks access to /api/students when mustChangePassword=true', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: 'test@student.com',
          username: 'test_student',
          password: bcrypt.hashSync('password123', 10),
          role: 'student',
          regNo: 'TEST-004',
          mustChangePassword: true,
        },
      })
      createdRecords.users.push(user.id)

      const token = signToken({ id: user.id, role: 'student', tokenVersion: 0, mustChangePassword: true, regNo: 'TEST-004' })
      const response = await request(app)
        .get('/api/students')
        .set({ Authorization: `Bearer ${token}` })

      expect(response.status).toBe(403)
      expect(response.body.message).toContain('Password change required')
    })

    it('allows admin with mustChangePassword=false full access', async () => {
      const response = await request(app)
        .get('/api/students')
        .set(auth(admin))

      expect(response.status).toBe(200)
    })

    it('allows warden with mustChangePassword=false full access', async () => {
      const response = await request(app)
        .get('/api/warden/dashboard')
        .set(auth(warden))

      expect(response.status).toBe(200)
    })
  })

  describe('Student backend password validation', () => {
    it('rejects password shorter than 6 characters', async () => {
      const response = await request(app)
        .post('/api/students')
        .set(auth(admin))
        .send({ regNo: 'NEW-REG', name: 'New Student', password: 'abc', emailid: 'new@student.test' })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('at least 6')
    })

    it('rejects non-string password', async () => {
      const response = await request(app)
        .post('/api/students')
        .set(auth(admin))
        .send({ regNo: 'NEW-REG', name: 'New Student', password: 123, emailid: 'new@student.test' })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('at least 6')
    })

    it('accepts valid password', async () => {
      const response = await request(app)
        .post('/api/students')
        .set(auth(admin))
        .send({ regNo: 'NEW-REG', name: 'New Student', password: 'password123', gender: 'Male', course: 'B.Tech', emailid: 'new@student.com' })

      expect(response.status).toBe(201)
      createdRecords.users.push(response.body.userId)
      createdRecords.students.push(response.body.id)
    })
  })

  describe('Password change flow', () => {
    it('changes password and clears mustChangePassword flag', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: 'test@student.com',
          username: 'test_student',
          password: bcrypt.hashSync('oldpass', 10),
          role: 'student',
          regNo: 'TEST-005',
          mustChangePassword: true,
          tokenVersion: 0,
        },
      })
      createdRecords.users.push(user.id)

      const token = signToken({ id: user.id, role: 'student', tokenVersion: 0, mustChangePassword: true, regNo: 'TEST-005' })
      const response = await request(app)
        .post('/api/auth/change-password')
        .set({ Authorization: `Bearer ${token}` })
        .send({ currentPassword: 'oldpass', newPassword: 'newpassword123' })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Password changed successfully')

      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
      expect(updatedUser.mustChangePassword).toBe(false)
      expect(updatedUser.tokenVersion).toBe(1)

      const validPassword = await bcrypt.compare('newpassword123', updatedUser.password)
      expect(validPassword).toBe(true)
    })

    it('rejects incorrect current password', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: 'test@student.com',
          username: 'test_student',
          password: bcrypt.hashSync('correctpass', 10),
          role: 'student',
          regNo: 'TEST-006',
          mustChangePassword: true,
          tokenVersion: 0,
        },
      })
      createdRecords.users.push(user.id)

      const token = signToken({ id: user.id, role: 'student', tokenVersion: 0, mustChangePassword: true, regNo: 'TEST-006' })
      const response = await request(app)
        .post('/api/auth/change-password')
        .set({ Authorization: `Bearer ${token}` })
        .send({ currentPassword: 'wrongpass', newPassword: 'newpassword123' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Current password is incorrect')
    })

    it('requires both current and new password', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: 'test@student.com',
          username: 'test_student',
          password: bcrypt.hashSync('oldpass', 10),
          role: 'student',
          regNo: 'TEST-007',
          mustChangePassword: true,
          tokenVersion: 0,
        },
      })
      createdRecords.users.push(user.id)

      const token = signToken({ id: user.id, role: 'student', tokenVersion: 0, mustChangePassword: true, regNo: 'TEST-007' })
      const response = await request(app)
        .post('/api/auth/change-password')
        .set({ Authorization: `Bearer ${token}` })
        .send({ currentPassword: 'oldpass' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Current password and new password are required')
    })
  })
})