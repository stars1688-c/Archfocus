// src/lib/ai/types.ts

export interface Account {
  id: string
  name: string
  position: string
  audience: string
  description: string
  xiaohongshuId?: string
  email?: string
  phone?: string
}

export interface Topic {
  title: string
  reason: string
}

export interface GeneratedContent {
  title: string
  content: string
  tags: string[]
}

export interface SensitiveWordResult {
  passed: boolean
  illegalWords?: { word: string; type: string }[]
}

export interface WorkflowResult {
  success: boolean
  topics?: Topic[]
  content?: GeneratedContent
  humanizedContent?: string
  sensitiveResult?: SensitiveWordResult
  error?: string
}

// 选题生成输入
export interface TopicGenerationInput {
  account: Account
  searchEnabled?: boolean
  excludeTopics?: string[]
}

// 文案生成输入
export interface ContentGenerationInput {
  account: Account
  topic: string
  searchResults?: string[]
  userRequirements?: string
}

// 去AI味输入
export interface HumanizerInput {
  content: string
}

// 敏感词检测输入
export interface SensitiveCheckInput {
  content: string
}
