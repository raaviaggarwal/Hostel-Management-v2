// import path from 'node:path'
// import fs from 'node:fs'
// import { fileURLToPath } from 'node:url'
// import express from 'express'
// import helmet from 'helmet'
// import cors from 'cors'
// import rateLimit from 'express-rate-limit'
// import { router } from './routes/index.js'

// const __dirname = path.dirname(fileURLToPath(import.meta.url))
// const distDir = path.resolve(__dirname, '../../client/dist')
// const hasClientBuild = fs.existsSync(path.join(distDir, 'index.html'))

// const corsOrigins = process.env.CORS_ORIGIN
//   ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
//   : ['http://localhost:5173']

// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   limit: 1000,
//   standardHeaders: 'draft-7',
//   legacyHeaders: false,
// })

// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   limit: 10,
//   standardHeaders: 'draft-7',
//   legacyHeaders: false,
// })

// export function createApp() {
//   const app = express()
//   app.use(helmet())
//   app.use(cors({ origin: corsOrigins }))
//   app.use(express.json({ limit: '2mb' }))
//   if (process.env.NODE_ENV === 'production') {
//     app.use('/api', generalLimiter)
//     app.use('/api/auth/login', loginLimiter)
//   }
//   app.use('/api', router)
//   if (hasClientBuild) {
//     app.use(express.static(distDir))
//     app.use((req, res, next) => {
//       if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
//       return res.sendFile(path.join(distDir, 'index.html'))
//     })
//   }
//   app.use((err, _req, res, _next) => {
//     console.error(err)
//     res.status(500).json({ message: 'Internal server error' })
//   })
//   app.use((_req, res) => res.status(404).json({ message: 'Not found' }))
//   return app
// }



import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

import { router } from './routes/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const distDir = path.resolve(__dirname, '../../client/dist')

const hasClientBuild = fs.existsSync(path.join(distDir, 'index.html'))

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.CORS_ORIGIN,
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(','))
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no Origin header, such as health checks
    if (!origin) {
      return callback(null, true)
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    console.log('CORS blocked for origin:', origin)
    return callback(new Error(`CORS not allowed for origin: ${origin}`))
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

export function createApp() {
  const app = express()

  app.use(helmet())

  // CORS MUST come before routes
  app.use(cors(corsOptions))

  // Handle browser preflight OPTIONS requests
  app.options('*', cors(corsOptions))

  app.use(express.json({ limit: '2mb' }))

  if (process.env.NODE_ENV === 'production') {
    app.use('/api', generalLimiter)
    app.use('/api/auth/login', loginLimiter)
  }

  // API routes
  app.use('/api', router)

  // Serve frontend only when a local client build exists
  if (hasClientBuild) {
    app.use(express.static(distDir))

    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next()
      }

      return res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Server error:', err.message)

    // Return a useful CORS error instead of silently failing
    if (err.message?.includes('CORS not allowed')) {
      return res.status(403).json({
        message: err.message,
      })
    }

    return res.status(500).json({
      message: 'Internal server error',
    })
  })

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      message: 'Not found',
    })
  })

  return app
}