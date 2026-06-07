// src/types/index.ts

export interface User {
  id: string
  phone: string
  name?: string
  createdAt: Date
}

export interface Account {
  id: string
  userId: string
  name: string
  xiaohongshuId?: string
  email?: string
  phone?: string
  position: string
  audience: string
  description: string
  status: 'active' | 'pending'
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  accountId: string
  title: string
  content: string
  images: string[]
  likes: number
  comments: number
  bookmarks: number
  shares: number
  status: 'pending' | 'published'
  publishAt?: Date
  publishedAt?: Date
  xiaohongshuUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface SyncConfig {
  id: string
  intervalDays: number
  syncTime: string
  lastSyncAt?: Date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Analytics types
export interface NoteAnalytics {
  id: string
  title: string
  content: string
  images: string[]
  likes: number
  comments: number
  bookmarks: number
  shares: number
  publishedAt: Date
  xiaohongshuUrl?: string
}

export interface AnalyticsFilter {
  startDate?: string
  endDate?: string
  likesMin?: number
  likesMax?: number
  bookmarksMin?: number
  bookmarksMax?: number
  commentsMin?: number
  commentsMax?: number
  accountId?: string
}

export type SortField = 'publishedAt' | 'likes' | 'comments' | 'bookmarks' | 'shares'
export type SortDirection = 'asc' | 'desc'

// Extended types for API responses
export interface NoteWithAccount extends Note {
  account?: {
    name: string
  }
}