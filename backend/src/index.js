import 'dotenv/config'
import { createApp } from './app.js'
import { prisma } from './prisma.js'
import { logger } from './logger.js'

const port = process.env.PORT || 5000

const app = createApp()

const server = app.listen(port, () => {
  logger.info(`Hostel Management API listening on :${port}`)
})

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`)
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Database connections closed')
    process.exit(0)
  })

  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))