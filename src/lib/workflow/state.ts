// src/lib/workflow/state.ts

import type { Account, Topic, SensitiveWordResult } from '../ai/types'
import type { HtmlStyle } from './htmlStyles'

// ============================================
// 文案生成工作流
// ============================================

// 文案生成工作流步骤
export type ContentWorkflowStep = 'topic_generation' | 'content_generation' | 'humanization' | 'sensitive_check' | 'done' | 'error'

// 文案生成工作流状态
export interface ContentWorkflowState {
  // 输入
  account: Account
  topic?: string

  // 中间状态
  topics?: Topic[]
  selectedTopic?: string
  searchResults?: string[]
  rawContent?: string
  humanizedContent?: string
  sensitiveResult?: SensitiveWordResult
  error?: string

  // 配置
  searchEnabled: boolean
  hotKeywords?: string[]
  userRequirements?: string
  excludeTopics?: string[]
  userFeedback?: string

  // 流程控制
  currentStep: ContentWorkflowStep
}

// ============================================
// 配图生成工作流
// ============================================

// 配图生成类型
export type ImageGenerationType = 'ai_prompt' | 'html_screenshot'

// 配图生成工作流步骤
export type ImageWorkflowStep = 'image_prompt_generation' | 'image_generation' | 'html_screenshot' | 'done' | 'error'

// 配图生成工作流状态
export interface ImageWorkflowState {
  // 输入
  content: string
  title?: string

  // 中间状态
  imagePrompt?: string
  generatedImageUrl?: string
  htmlScreenshotUrl?: string
  error?: string

  // 配置
  imageType: ImageGenerationType
  imageModel?: 'gpt-image-2' | 'doubao-seedream-5-0-lite'
  htmlStyle?: HtmlStyle

  // 流程控制
  currentStep: ImageWorkflowStep
}
