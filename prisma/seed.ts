import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminUsername = 'admin'
  const existing = await prisma.admin.findUnique({ where: { username: adminUsername } })

  if (!existing) {
    const hashed = await bcrypt.hash('admin123@bca', 10)
    await prisma.admin.create({
      data: {
        username: adminUsername,
        password: hashed,
        name: '管理员',
      },
    })
    console.log('✅ Admin user created (admin / admin123@bca)')
  } else {
    console.log('ℹ️  Admin user already exists')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
