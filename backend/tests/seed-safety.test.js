import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { seedDatabase, getCurrentDatabaseName } from '../prisma/seed.js'

const createMockPrisma = (dbName) => ({
  $queryRawUnsafe: vi.fn().mockResolvedValue([{ current_database: dbName }]),
  $transaction: vi.fn().mockResolvedValue(undefined),
  complaintAction: { deleteMany: vi.fn().mockResolvedValue({}) },
  complaint: { deleteMany: vi.fn().mockResolvedValue({}) },
  allocation: { deleteMany: vi.fn().mockResolvedValue({}) },
  attendance: { deleteMany: vi.fn().mockResolvedValue({}) },
  entryExit: { deleteMany: vi.fn().mockResolvedValue({}) },
  leave: { deleteMany: vi.fn().mockResolvedValue({}) },
  messFeedback: { deleteMany: vi.fn().mockResolvedValue({}) },
  messComplaint: { deleteMany: vi.fn().mockResolvedValue({}) },
  medicalIncident: { deleteMany: vi.fn().mockResolvedValue({}) },
  inventoryItem: { deleteMany: vi.fn().mockResolvedValue({}) },
  housekeepingTask: { deleteMany: vi.fn().mockResolvedValue({}) },
  messMenu: { deleteMany: vi.fn().mockResolvedValue({}) },
  messInspection: { deleteMany: vi.fn().mockResolvedValue({}) },
  wifiAccessPoint: { deleteMany: vi.fn().mockResolvedValue({}) },
  committeeMember: { deleteMany: vi.fn().mockResolvedValue({}) },
  committeeMeeting: { deleteMany: vi.fn().mockResolvedValue({}) },
  auditLog: { deleteMany: vi.fn().mockResolvedValue({}) },
  notice: { deleteMany: vi.fn().mockResolvedValue({}) },
  notification: { deleteMany: vi.fn().mockResolvedValue({}) },
  student: { deleteMany: vi.fn().mockResolvedValue({}) },
  room: { deleteMany: vi.fn().mockResolvedValue({}) },
  block: { deleteMany: vi.fn().mockResolvedValue({}) },
  hostel: { deleteMany: vi.fn().mockResolvedValue({}) },
  user: { deleteMany: vi.fn().mockResolvedValue({}) },
  medicalDispensary: { deleteMany: vi.fn().mockResolvedValue({}) },
  setting: { deleteMany: vi.fn().mockResolvedValue({}) },
})

describe('Seed Database Safety', () => {
  it('getCurrentDatabaseName returns correct database name', async () => {
    const mockPrisma = createMockPrisma('hostel_management_test')
    const name = await getCurrentDatabaseName(mockPrisma)
    expect(name).toBe('hostel_management_test')
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(`SELECT current_database()`)
  })

  it('getCurrentDatabaseName returns unknown for unexpected result', async () => {
    const mockPrisma = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([])
    }
    const name = await getCurrentDatabaseName(mockPrisma)
    expect(name).toBe('unknown')
  })

  it('seedDatabase rejects non-test database', async () => {
    const mockPrisma = createMockPrisma('production_db')

    await expect(seedDatabase(mockPrisma)).rejects.toThrow(
      "seedDatabase refused to run: connected database is 'production_db', expected 'hostel_management_test'"
    )
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('seedDatabase passes database name check for test database', async () => {
    const mockPrisma = createMockPrisma('hostel_management_test')
    mockPrisma.$transaction.mockRejectedValue(new Error('mock incomplete but name check passed'))

    await expect(seedDatabase(mockPrisma)).rejects.toThrow('mock incomplete but name check passed')
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})