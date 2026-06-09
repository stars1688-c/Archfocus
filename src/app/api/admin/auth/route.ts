import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signAdminToken } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    const admin = await prisma.admin.findUnique({ where: { username } })

    if (!admin) {
      return NextResponse.json(
        { success: false, error: '管理员账号不存在' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, admin.password)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      )
    }

    const token = await signAdminToken({
      userId: admin.id,
      username: admin.username,
    })

    return NextResponse.json({
      success: true,
      data: {
        user: { id: admin.id, username: admin.username, name: admin.name },
        token,
      },
    })
  } catch (error) {
    console.error('Admin auth error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
