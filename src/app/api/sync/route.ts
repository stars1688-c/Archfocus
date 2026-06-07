import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { fetchNotes } from '@/lib/tiktokomni'

// GET /api/sync - 获取同步配置
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    let config = await prisma.syncConfig.findFirst()

    if (!config) {
      config = await prisma.syncConfig.create({
        data: { intervalDays: 1, syncTime: '02:00' },
      })
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Get sync config error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// PUT /api/sync - 更新同步配置
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { intervalDays, syncTime } = body

    let config = await prisma.syncConfig.findFirst()

    if (!config) {
      config = await prisma.syncConfig.create({
        data: { intervalDays: intervalDays || 1, syncTime: syncTime || '02:00' },
      })
    } else {
      config = await prisma.syncConfig.update({
        where: { id: config.id },
        data: { intervalDays, syncTime },
      })
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Update sync config error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/sync - 触发手动同步
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { accountIds } = body

    // 获取需要同步的账号
    const accounts = await prisma.account.findMany({
      where: {
        userId: user.id,
        ...(accountIds?.length ? { id: { in: accountIds } } : {}),
      },
    })

    const results = []

    for (const account of accounts) {
      if (!account.xiaohongshuId) continue

      try {
        // 从 TikOmni 获取数据
        const syncResult = await fetchNotes(account.id, account.xiaohongshuId)

        // 更新笔记数据
        for (const noteData of syncResult.notes) {
          await prisma.note.upsert({
            where: { id: noteData.note_id },
            create: {
              id: noteData.note_id,
              accountId: account.id,
              title: noteData.title,
              content: noteData.content,
              images: JSON.stringify(noteData.images),
              likes: noteData.likes,
              comments: noteData.comments,
              bookmarks: noteData.bookmarks,
              shares: noteData.shares,
              status: 'published',
              publishedAt: new Date(noteData.published_at),
              xiaohongshuUrl: noteData.url,
            },
            update: {
              title: noteData.title,
              content: noteData.content,
              images: JSON.stringify(noteData.images),
              likes: noteData.likes,
              comments: noteData.comments,
              bookmarks: noteData.bookmarks,
              shares: noteData.shares,
            },
          })
        }

        results.push({ accountId: account.id, success: true, count: syncResult.notes.length })
      } catch (error) {
        console.error(`Sync error for account ${account.id}:`, error)
        results.push({ accountId: account.id, success: false, error: '同步失败' })
      }
    }

    // 更新同步配置的最后同步时间
    const syncConfig = await prisma.syncConfig.findFirst()
    if (syncConfig) {
      await prisma.syncConfig.update({
        where: { id: syncConfig.id },
        data: { lastSyncAt: new Date() },
      })
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}