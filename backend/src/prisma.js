import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

function getTestDatabaseUrl() {
  const isTestRuntime =
    process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'
  if (!isTestRuntime) return undefined

  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL must point to a dedicated test database; refusing to use DATABASE_URL.'
    )
  }

  try {
    const parsedUrl = new URL(url)
    const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1))
    if (
      !['postgres:', 'postgresql:'].includes(parsedUrl.protocol) ||
      !/(^|[_-])test([_-]|$)/i.test(databaseName)
    ) {
      throw new Error()
    }
  } catch {
    throw new Error(
      'TEST_DATABASE_URL must be a PostgreSQL URL whose database name clearly identifies it as a test database.'
    )
  }

  return url
}

const testDatabaseUrl = getTestDatabaseUrl()
export const prisma = new PrismaClient(
  testDatabaseUrl ? { datasourceUrl: testDatabaseUrl } : undefined
)