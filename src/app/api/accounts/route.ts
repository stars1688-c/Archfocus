import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/accounts - 获取当前用户的所有账号
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: accounts })
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/accounts - 创建新账号
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { name, xiaohongshuId, email, phone, position, audience, description } = body

    if (!name || !position || !audience || !description) {
      return NextResponse.json(
        { success: false, error: '必填字段不能为空' },
        { status: 400 }
      )
    }

    const account = await prisma.account.create({
      data: {
        userId: user.id,
        name,
        xiaohongshuId,
        email,
        phone,
        position,
        audience,
        description,
      },
    })

    return NextResponse.json({ success: true, data: account })
  } catch (error) {
    console.error('Create account error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// PUT /api/accounts - 更新账号
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, xiaohongshuId, email, phone, position, audience, description } = body

    if (!id) {
      return NextResponse.json({ success: false, error: '账号ID不能为空' }, { status: 400 })
    }

    // 验证账号所属权
    const existing = await prisma.account.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (xiaohongshuId !== undefined) updates.xiaohongshuId = xiaohongshuId
    if (email !== undefined) updates.email = email
    if (phone !== undefined) updates.phone = phone
    if (position !== undefined) updates.position = position
    if (audience !== undefined) updates.audience = audience
    if (description !== undefined) updates.description = description

    const account = await prisma.account.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({ success: true, data: account })
  } catch (error) {
    console.error('Update account error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/accounts - 删除账号
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: '账号ID不能为空' }, { status: 400 })
    }

    // 验证账号所属权
    const existing = await prisma.account.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }

    await prisma.account.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}