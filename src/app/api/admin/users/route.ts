import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminUser } from '@/lib/admin-auth'
import bcrypt from 'bcryptjs'

// GET /api/admin/users - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (keyword) {
      where.OR = [
        { phone: { contains: keyword } },
        { name: { contains: keyword } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { accounts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        users: users.map(u => ({
          ...u,
          accountCount: u._count.accounts,
          _count: undefined,
        })),
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/admin/users - 创建用户
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, password, name } = body

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: '手机号和密码不能为空' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: '该手机号已注册' },
        { status: 409 }
      )
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { phone, password: hash, name: name || null },
      select: { id: true, phone: true, name: true, createdAt: true },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// PUT /api/admin/users - 更新用户
export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { id, phone, password, name } = body

    if (!id) {
      return NextResponse.json({ success: false, error: '用户ID不能为空' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    const data: any = {}
    if (phone !== undefined) data.phone = phone
    if (name !== undefined) data.name = name
    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, phone: true, name: true, createdAt: true },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/admin/users - 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: '用户ID不能为空' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    const accounts = await prisma.account.findMany({ where: { userId: id }, select: { id: true } })
    const accountIds = accounts.map(a => a.id)
    if (accountIds.length > 0) {
      await prisma.note.deleteMany({ where: { accountId: { in: accountIds } } })
      await prisma.account.deleteMany({ where: { userId: id } })
    }
    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
