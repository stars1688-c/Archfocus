import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}
const secret = new TextEncoder().encode(JWT_SECRET)

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json()

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: '手机号和密码不能为空' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { phone } })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      )
    }

    const token = await new SignJWT({
      userId: user.id,
      phone: user.phone
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret)

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, phone: user.phone, name: user.name },
        token,
      },
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}