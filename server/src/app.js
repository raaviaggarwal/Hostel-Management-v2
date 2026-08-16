import express from 'express'
import cors from 'cors'
import { router } from './routes/index.js'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  app.use('/api', router)
  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  })
  app.use((_req, res) => res.status(404).json({ message: 'Not found' }))
  return app
}