// src/lib/tiktokomni.ts
import axios from 'axios'

const tiktokomniApi = axios.create({
  baseURL: process.env.TIKOMNI_API_URL || 'https://api.tiktokomni.com',
  headers: {
    'Authorization': `Bearer ${process.env.TIKOMNI_API_KEY}`,
    'Content-Type': 'application/json',
  },
})

export interface TikOmniNote {
  note_id: string
  title: string
  content: string
  images: string[]
  likes: number
  comments: number
  bookmarks: number
  shares: number
  published_at: number
  url: string
}

export interface TikOmniSyncResult {
  success: boolean
  notes: TikOmniNote[]
  syncedAt: string
}

// 获取小红书账号的笔记数据
export async function fetchNotes(accountId: string, xiaohongshuId: string): Promise<TikOmniSyncResult> {
  try {
    const response = await tiktokomniApi.get('/api/u1/v1/xiaohongshu/app_v2/get_user_posted_notes', {
      params: { user_id: xiaohongshuId },
    })
    const apiData = response.data

    // 转换 API 返回数据为统一格式
    const notes: TikOmniNote[] = (apiData.data?.data?.notes || []).map((note: any) => ({
      note_id: note.id,
      title: note.display_title || note.title,
      content: note.desc || '',
      images: (note.images_list || []).map((img: any) => img.url || img.url_size_large || '').filter(Boolean),
      likes: note.likes || 0,
      comments: note.comments_count || 0,
      bookmarks: note.collected_count || 0,
      shares: note.share_count || 0,
      published_at: note.create_time || 0,
      url: `https://www.xiaohongshu.com/explore/${note.id}`,
    }))

    return {
      success: true,
      notes,
      syncedAt: new Date().toISOString(),
    }
  } catch (error) {
    throw new Error(`笔记同步失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 手动触发同步
export async function triggerSync(accountIds: string[]): Promise<TikOmniSyncResult[]> {
  try {
    const response = await tiktokomniApi.post('/sync/trigger', {
      account_ids: accountIds,
    })
    return response.data as TikOmniSyncResult[]
  } catch (error) {
    throw new Error(`同步触发失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}