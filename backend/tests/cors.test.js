import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'

let app
let devApp

beforeAll(async () => {
  process.env.NODE_ENV = 'production'
  process.env.CORS_ORIGIN = 'https://hostel-management-v2-staging.vercel.app'
  const { createApp } = await import('../src/app.js')
  app = createApp()

  process.env.NODE_ENV = 'development'
  process.env.CORS_ORIGIN = ''
  const { createApp: createAppDev } = await import('../src/app.js')
  devApp = createAppDev()
})

afterAll(() => {
  delete process.env.NODE_ENV
  delete process.env.CORS_ORIGIN
})

describe('CORS Configuration', () => {
  it('allows configured staging origin', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://hostel-management-v2-staging.vercel.app')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://hostel-management-v2-staging.vercel.app')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('allows localhost origin in development', async () => {
    const res = await request(devApp)
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('rejects unauthorized origin', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.status).toBe(403)
    expect(res.body.message).toContain('CORS not allowed')
  })

  it('rejects wildcard vercel.app subdomain not in allowlist', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://random-preview.vercel.app')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.status).toBe(403)
  })

  it('rejects health check with no Origin header in production', async () => {
    const res = await request(app)
      .get('/health')

    expect(res.status).toBe(403)
    expect(res.body.message).toContain('Origin header required')
  })

  it('includes credentials in allowed headers', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://hostel-management-v2-staging.vercel.app')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Authorization,Content-Type')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-headers']).toContain('Authorization')
    expect(res.headers['access-control-allow-headers']).toContain('Content-Type')
  })
})