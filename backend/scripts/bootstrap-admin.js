import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { BCRYPT_ROUNDS } from '../src/auth.js'

const STAGING_DATABASE_NAMES = ['hostel_management_staging', 'hostel-management-staging']

function isStagingDatabase(dbName) {
  return STAGING_DATABASE_NAMES.some((name) => dbName === name)
}

async function getCurrentDatabaseName(prisma) {
  const result = await prisma.$queryRawUnsafe(`SELECT current_database()`)
  return result[0]?.current_database ?? 'unknown'
}

function writeSecureCredentialFile(credential, adminId) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-admin-'))
  const filePath = path.join(tempDir, 'admin-credential.txt')
  fs.writeFileSync(filePath, credential, { mode: 0o600 })
  return { tempDir, filePath }
}

async function bootstrap() {
  const prisma = new PrismaClient()

  try {
    const dbName = await getCurrentDatabaseName(prisma)

    if (!isStagingDatabase(dbName)) {
      console.error(`BOOTSTRAP ABORTED: Connected database is '${dbName}', expected a staging database (exact match: ${STAGING_DATABASE_NAMES.join(', ')}).`)
      process.exit(1)
    }

    const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } })
    if (existingAdmin) {
      console.log('Admin account already exists. Bootstrap skipped.')
      return
    }

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL
    const name = process.env.BOOTSTRAP_ADMIN_NAME

    if (!email || !name) {
      console.error('BOOTSTRAP ABORTED: Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_NAME environment variables.')
      process.exit(1)
    }

    const tempPassword = crypto.randomBytes(24).toString('base64url').slice(0, 32)
    const hash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS)

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        username: email,
        password: hash,
        role: 'admin',
        mustChangePassword: true,
        tokenVersion: 0,
      },
    })

    const { tempDir, filePath } = writeSecureCredentialFile(tempPassword, admin.id)

    console.log('=== STAGING ADMIN CREATED ===')
    console.log(`Admin ID: ${admin.id}`)
    console.log(`Admin email: ${email}`)
    console.log('A temporary password has been generated and stored in a secure temporary file.')
    console.log(`Credential file: ${filePath}`)
    console.log('File permissions: owner read/write only (0600)')
    console.log('IMPORTANT: Retrieve the password from this file immediately.')
    console.log('The file will be automatically deleted when the system cleans the temp directory.')
    console.log('The admin MUST change password on first login (mustChangePassword=true).')
    console.log('===============================')

    setTimeout(() => {
      try {
        fs.unlinkSync(filePath)
        fs.rmdirSync(tempDir)
      } catch {}
    }, 300000).unref()
  } catch (error) {
    console.error('Bootstrap failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

bootstrap()