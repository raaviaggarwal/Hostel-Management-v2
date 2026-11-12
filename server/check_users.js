import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$connect()
    console.log('Database connected successfully')

    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, password: true }
    })
    console.log('Users count:', users.length)
    users.forEach(u => {
      const pwMasked = u.password ? u.password.substring(0, 5) + '...' : 'null'
      console.log(` - ${u.username} (${u.email}) role=${u.role} password=${pwMasked}`)
    })

    const admin = users.find(u => u.username === 'admin')
    if (admin) {
      const bcrypt = require('bcryptjs')
      const valid = await bcrypt.compare('admin123', admin.password)
      console.log('Password admin123 matches:', valid)
    } else {
      console.log('Admin user NOT found in database')
    }
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()