import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'

const app = createApp()

describe('Health Check Endpoint', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.uptime).toBeTypeOf('number')
    expect(res.body.uptime).toBeGreaterThanOrEqual(0)
  })

  it('does not expose secrets or environment variables', async () => {
    const res = await request(app).get('/health')

    const bodyString = JSON.stringify(res.body)
    expect(bodyString).not.toMatch(/DATABASE_URL/i)
    expect(bodyString).not.toMatch(/JWT_SECRET/i)
    expect(bodyString).not.toMatch(/password/i)
    expect(bodyString).not.toMatch(/secret/i)
  })

  it('does not expose stack traces', async () => {
    const res = await request(app).get('/health')

    const bodyString = JSON.stringify(res.body)
    expect(bodyString).not.toMatch(/stack/i)
    expect(bodyString).not.toMatch(/Error:/i)
  })

  it('is accessible without authentication', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })

  it('works with CORS (no origin header)', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})