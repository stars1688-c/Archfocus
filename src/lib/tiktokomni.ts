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
  published_at: string
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
    const response = await tiktokomniApi.post('/sync/notes', {
      account_id: accountId,
      xiaohongshu_id: xiaohongshuId,
    })
    return response.data
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