import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { fetchNotes } from '@/lib/tiktokomni'
import { findMatchingNote } from '@/lib/notes'

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

    // 统计信息
    const stats = {
      linked: 0,
      pendingLink: 0,
      externalNew: 0,
      movedToPublished: 0,
    }

    const results = []

    for (const account of accounts) {
      if (!account.xiaohongshuId) continue

      try {
        // 从 TikOmni 获取数据
        const syncResult = await fetchNotes(account.id, account.xiaohongshuId)

        // 获取本地已发布和待发布列表
        const localPublishedNotes = await prisma.note.findMany({
          where: { accountId: account.id, status: 'published' },
          select: { id: true, title: true, platformSource: true, syncStatus: true },
        })

        const localPendingNotes = await prisma.note.findMany({
          where: { accountId: account.id, status: 'pending' },
          select: { id: true, title: true },
        })

        // 收集已匹配的本地笔记 ID
        const matchedNoteIds = new Set<string>()

        // 遍历 TikOmni 笔记，进行匹配
        for (const noteData of syncResult.notes) {
          // 先在已发布列表中查找匹配
          const publishedMatch = findMatchingNote(
            { title: noteData.title, note_id: noteData.note_id },
            localPublishedNotes
          )

          if (publishedMatch) {
            // Case 1: TikOmni 有 + 已发布有 = 平台创作，已关联
            matchedNoteIds.add(publishedMatch.id)
            await prisma.note.update({
              where: { id: publishedMatch.id },
              data: { platformSource: 'platform', syncStatus: 'linked' },
            })
            stats.linked++
            continue
          }

          // 再在待发布列表中查找匹配
          const pendingMatch = findMatchingNote(
            { title: noteData.title, note_id: noteData.note_id },
            localPendingNotes
          )

          if (pendingMatch) {
            // Case 2: TikOmni 有 + 待发布有 = 平台创作，已关联，自动移至已发布
            matchedNoteIds.add(pendingMatch.id)
            await prisma.note.update({
              where: { id: pendingMatch.id },
              data: {
                status: 'published',
                publishedAt: new Date(noteData.published_at),
                platformSource: 'platform',
                syncStatus: 'linked',
              },
            })
            stats.linked++
            stats.movedToPublished++
            continue
          }

          // Case 3: TikOmni 有 + 本地都没有 = 非平台创作，入库
          await prisma.note.create({
            data: {
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
              platformSource: 'external',
              syncStatus: 'linked',
            },
          })
          stats.externalNew++
        }

        // Case 4: 已发布列表中有但 TikOmni 找不到的 = 非平台创作，待关联
        for (const note of localPublishedNotes) {
          if (!matchedNoteIds.has(note.id) && note.platformSource === 'platform') {
            await prisma.note.update({
              where: { id: note.id },
              data: { syncStatus: 'pending_link' },
            })
            stats.pendingLink++
          }
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

    return NextResponse.json({ success: true, data: { results, stats } })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}