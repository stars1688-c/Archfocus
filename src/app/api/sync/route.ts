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

      // 获取同步配置
      const syncConfig = await prisma.syncConfig.findFirst()

      try {
        // 从 TikOmni 获取数据
        const syncResult = await fetchNotes(account.id, account.xiaohongshuId)

        // 存储请求和响应日志
        await prisma.syncLog.create({
          data: {
            accountId: account.id,
            syncConfigId: syncConfig?.id,
            requestUrl: `/sync/notes`,
            requestBody: JSON.stringify({ user_id: account.xiaohongshuId }),
            responseBody: JSON.stringify(syncResult),
            statusCode: 200,
            success: true,
            notesCount: syncResult.notes?.length || 0,
          },
        })

        // 获取本地笔记（按来源分别查询）
        const localPlatformNotes = await prisma.note.findMany({
          where: { accountId: account.id, status: 'published', platformSource: 'platform' },
          select: { id: true, title: true, platformSource: true, syncStatus: true },
        })

        const localExternalNotes = await prisma.note.findMany({
          where: { accountId: account.id, status: 'published', platformSource: 'external' },
          select: { id: true, title: true },
        })

        const localPendingNotes = await prisma.note.findMany({
          where: { accountId: account.id, status: 'pending' },
          select: { id: true, title: true },
        })

        // 收集已匹配的本地笔记 ID
        const matchedNoteIds = new Set<string>()

        // 遍历 TikOmni 笔记，进行匹配
        for (const noteData of syncResult.notes) {
          // Case 1: 优先匹配平台创作笔记（通过系统创作的）
          const platformMatch = findMatchingNote(
            { title: noteData.title, note_id: noteData.note_id },
            localPlatformNotes
          )

          if (platformMatch) {
            matchedNoteIds.add(platformMatch.id)
            await prisma.note.update({
              where: { id: platformMatch.id },
              data: {
                // 不覆盖 content - 保留系统创作的完整内容
                likes: noteData.likes,
                comments: noteData.comments,
                bookmarks: noteData.bookmarks,
                shares: noteData.shares,
                xiaohongshuUrl: noteData.url,
                publishedAt: new Date(noteData.published_at * 1000),
                syncStatus: 'linked',
              },
            })
            stats.linked++
            continue
          }

          // Case 2: 匹配待发布笔记
          const pendingMatch = findMatchingNote(
            { title: noteData.title, note_id: noteData.note_id },
            localPendingNotes
          )

          if (pendingMatch) {
            matchedNoteIds.add(pendingMatch.id)
            await prisma.note.update({
              where: { id: pendingMatch.id },
              data: {
                status: 'published',
                // 不覆盖 content - 保留待发布笔记的完整内容
                likes: noteData.likes,
                comments: noteData.comments,
                bookmarks: noteData.bookmarks,
                shares: noteData.shares,
                xiaohongshuUrl: noteData.url,
                publishedAt: new Date(noteData.published_at * 1000),
                platformSource: 'platform',
                syncStatus: 'linked',
              },
            })
            stats.linked++
            stats.movedToPublished++
            continue
          }

          // Case 3: 匹配已有外部笔记（避免重复入库）
          const externalMatch = findMatchingNote(
            { title: noteData.title, note_id: noteData.note_id },
            localExternalNotes
          )

          if (externalMatch) {
            matchedNoteIds.add(externalMatch.id)
            await prisma.note.update({
              where: { id: externalMatch.id },
              data: {
                content: noteData.content,
                likes: noteData.likes,
                comments: noteData.comments,
                bookmarks: noteData.bookmarks,
                shares: noteData.shares,
                xiaohongshuUrl: noteData.url,
                publishedAt: new Date(noteData.published_at * 1000),
                syncStatus: 'linked',
              },
            })
            stats.linked++
            continue
          }

          // Case 4: TikOmni 有 + 本地完全没有 = 非平台创作，入库
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
              publishedAt: new Date(noteData.published_at * 1000),
              xiaohongshuUrl: noteData.url,
              platformSource: 'external',
              syncStatus: 'linked',
            },
          })
          stats.externalNew++
        }

        // Case 5: 平台创作笔记在 TikOmni 找不到的 = 待关联
        for (const note of localPlatformNotes) {
          if (!matchedNoteIds.has(note.id)) {
            await prisma.note.update({
              where: { id: note.id },
              data: { syncStatus: 'pending_link' },
            })
            stats.pendingLink++
          }
        }

        results.push({ accountId: account.id, success: true, count: syncResult.notes.length })
      } catch (error: any) {
        console.error(`Sync error for account ${account.id}:`, error)

        // 存储失败日志
        await prisma.syncLog.create({
          data: {
            accountId: account.id,
            syncConfigId: syncConfig?.id,
            requestUrl: `/sync/notes`,
            requestBody: JSON.stringify({ user_id: account.xiaohongshuId }),
            responseBody: JSON.stringify({ error: error.message }),
            statusCode: error.response?.status || 500,
            success: false,
            errorMessage: error.message,
            notesCount: 0,
          },
        })

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