import { prisma } from './src/prisma.js'
import express from 'express'
import bcrypt from 'bcryptjs'

const app = express()
app.use(express.json())

app.post('/api/auth/login', async (req, res) => {
  const body = req.body || {}
  const { usernameOrEmail, password } = body
  console.log('Login request body:', body)
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
  })
  console.log('Found user:', user ? user.username : 'NOT FOUND')
  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ message: 'Invalid username/email or password' })
  }
  return res.status(200).json({ token: 'test', user: { id: user.id, username: user.username, role: user.role } })
})

app.listen(3001, async () => {
  console.log('Test server on port 3001')
  
  // Test 1: Login with usernameOrEmail
  const res1 = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: 'admin', password: 'admin123' })
  })
  console.log('Test 1 (usernameOrEmail) status:', res1.status, 'body:', await res1.json())
  
  // Test 2: Login with username (wrong field name)
  const res2 = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  })
  console.log('Test 2 (username) status:', res2.status, 'body:', await res2.json())
  
  // Test 3: Login with email
  const res3 = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: 'admin@hostel.com', password: 'admin123' })
  })
  console.log('Test 3 (email) status:', res3.status, 'body:', await res3.json())
  
  // Test 4: Wrong password
  const res4 = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: 'admin', password: 'wrong123' })
  })
  console.log('Test 4 (wrong password) status:', res4.status, 'body:', await res4.json())
  
  setTimeout(() => process.exit(0), 1000)
})