import { prisma } from './src/prisma.js'
import express from 'express'
import bcrypt from 'bcryptjs'

const app = express()
app.use(express.json())

app.post('/api/auth/login', async (req, res) => {
  const body = req.body || {}
  console.log('Body received:', JSON.stringify(body))
  console.log('usernameOrEmail:', body.usernameOrEmail)
  console.log('username:', body.username)
  const { usernameOrEmail, username, password } = body
  const identifier = username || usernameOrEmail
  console.log('identifier:', identifier)
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  })
  console.log('Found user:', user ? user.username : 'NOT FOUND')
  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ message: 'Invalid username/email or password' })
  }
  return res.status(200).json({ token: 'test', user: { id: user.id, username: user.username, role: user.role } })
})

app.listen(3002, async () => {
  console.log('Test server on port 3002')
  
  // Test with username field
  const res1 = await fetch('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  })
  console.log('Test username status:', res1.status, 'body:', await res1.json())
  
  // Test with usernameOrEmail field
  const res2 = await fetch('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: 'admin', password: 'admin123' })
  })
  console.log('Test usernameOrEmail status:', res2.status, 'body:', await res2.json())
  
  // Test with email field
  const res3 = await fetch('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: 'admin@hostel.com', password: 'admin123' })
  })
  console.log('Test email status:', res3.status, 'body:', await res3.json())
  
  setTimeout(() => process.exit(0), 1000)
})