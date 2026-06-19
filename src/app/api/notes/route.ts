import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/notes - 获取笔记列表
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      account: { userId: user.id },
    }

    if (accountId) {
      where.accountId = accountId
    }

    if (status) {
      where.status = status
    }

    // 日期范围过滤（状态为 published 时按 publishedAt 过滤，否则按 createdAt）
    if (startDate || endDate) {
      const dateField = status === 'published' ? 'publishedAt' : 'createdAt'
      where[dateField] = {}
      if (startDate) {
        where[dateField].gte = new Date(startDate)
      }
      if (endDate) {
        // 将结束日期设为当天结束（23:59:59.999），包含当天所有数据
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where[dateField].lte = end
      }
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: { account: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.note.count({ where }),
    ])

    // 解析 images 字段（从 JSON 字符串转为数组）
    const parsedNotes = notes.map(note => ({
      ...note,
      images: typeof note.images === 'string' ? JSON.parse(note.images) : note.images,
    }))

    return NextResponse.json({
      success: true,
      data: { notes: parsedNotes, total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get notes error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/notes - 创建/保存笔记
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { accountId, title, content, images, status, publishAt, publishedAt } = body

    if (!accountId || !title) {
      return NextResponse.json({ success: false, error: '账号和标题不能为空' }, { status: 400 })
    }

    // 验证账号所属权
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }

    const note = await prisma.note.create({
      data: {
        accountId,
        title,
        content: content || '',
        images: JSON.stringify(images || []),
        status: status || 'pending',
        syncStatus: 'pending_link',
        publishAt: publishAt ? new Date(publishAt) : null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    })

    return NextResponse.json({ success: true, data: note })
  } catch (error) {
    console.error('Create note error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// PUT /api/notes - 更新笔记
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, content, images, status, publishAt, publishedAt } = body

    if (!id) {
      return NextResponse.json({ success: false, error: '笔记ID不能为空' }, { status: 400 })
    }

    // 验证笔记所属权
    const existing = await prisma.note.findFirst({
      where: { id, account: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: '笔记不存在' }, { status: 404 })
    }

    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (images !== undefined) updates.images = JSON.stringify(images)
    if (status !== undefined) updates.status = status
    if (publishAt !== undefined) updates.publishAt = publishAt ? new Date(publishAt) : null
    if (publishedAt !== undefined) updates.publishedAt = publishedAt ? new Date(publishedAt) : null

    const note = await prisma.note.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({ success: true, data: note })
  } catch (error) {
    console.error('Update note error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/notes - 删除笔记
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: '笔记ID不能为空' }, { status: 400 })
    }

    // 验证笔记所属权
    const existing = await prisma.note.findFirst({
      where: { id, account: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: '笔记不存在' }, { status: 404 })
    }

    await prisma.note.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}