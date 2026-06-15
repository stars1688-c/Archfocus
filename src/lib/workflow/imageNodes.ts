// src/lib/workflow/imageNodes.ts

import { callMiniMax } from '../ai/client'
import { getImagePromptGenerationPrompt } from '../ai/prompts'
import { generateImage, ImageModel } from '../ai/image'
import type { ImageWorkflowState, StepLog } from './state'
import { createStepLog } from './state'

// 配图提示词生成节点
export async function imagePromptGenerationNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = '配图提示词'
  const stepStart = new Date().toISOString()
  console.log(`[${stepName}] ===== 开始 =====`)

  try {
    const { content, imagePrompt } = state

    // 如果已有提示词（用户已确认），直接使用不重新生成
    if (imagePrompt) {
      console.log(`[${stepName}] 已有提示词，跳过生成`)
      const skipLog = createStepLog(stepName, 'skipped', '已有配图提示词，跳过', stepStart)
      return {
        imagePrompt,
        currentStep: 'image_prompt_generation',
        stepLogs: [...logs, skipLog]
      }
    }

    // 提取正文内容
    const contentMatch = (content || '').match(/正文：([\s\S]+?)(?:标签：|$)/)
    const contentText = contentMatch?.[1]?.trim() || content || ''
    console.log(`[${stepName}] 内容长度: ${contentText.length}字`)

    console.log(`[${stepName}] 调用 MiniMax API...`)
    const apiStart = Date.now()
    const response = await callMiniMax(
      getImagePromptGenerationPrompt(),
      `请根据以下笔记内容生成配图提示词：\n\n${contentText}`
    )
    const apiDuration = Date.now() - apiStart
    console.log(`[${stepName}] 提示词生成完成（${apiDuration}ms）`)

    const successLog = createStepLog(stepName, 'success', `配图提示词生成完成（${apiDuration}ms）`, stepStart)
    return {
      imagePrompt: response.text,
      currentStep: 'image_prompt_generation',
      stepLogs: [...logs, successLog]
    }
  } catch (error: any) {
    console.error(`[${stepName}] 错误:`, error.message)
    const errorLog = createStepLog(stepName, 'error', error.message || '配图提示词生成失败', stepStart)
    return {
      error: error.message || '配图提示词生成失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog]
    }
  }
}

// AI 图像生成节点
export async function imageGenerationNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = 'AI 配图'
  const stepStart = new Date().toISOString()
  console.log(`[${stepName}] ===== 开始 =====`)

  try {
    const { imagePrompt, imageModel = 'gpt-image-2' } = state

    if (!imagePrompt) {
      throw new Error('无配图提示词')
    }

    console.log(`[${stepName}] 模型: ${imageModel}`)
    const genStart = Date.now()
    const result = await generateImage({
      prompt: imagePrompt,
      model: imageModel as ImageModel
    })
    const genDuration = Date.now() - genStart

    if (!result.success) {
      throw new Error(result.error || '图像生成失败')
    }

    console.log(`[${stepName}] 图片生成完成（${genDuration}ms）`)
    const successLog = createStepLog(stepName, 'success', `AI 配图生成完成（${genDuration}ms）`, stepStart)

    return {
      generatedImageUrl: result.imageUrl || result.imageBase64,
      currentStep: 'image_generation',
      stepLogs: [...logs, successLog]
    }
  } catch (error: any) {
    console.error(`[${stepName}] 错误:`, error.message)
    const errorLog = createStepLog(stepName, 'error', error.message || '图像生成失败', stepStart)
    return {
      error: error.message || '图像生成失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog]
    }
  }
}

// HTML 截图节点 — 生成小红书风格卡片 SVG（无需浏览器）
export async function htmlScreenshotNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  try {
    const { content, title, htmlStyle = 'magazine' } = state

    if (!content) {
      throw new Error('无内容用于生成截图')
    }

    // 解析文案内容
    const titleMatch = (content || '').match(/标题：(.+)/)
    const contentMatch = (content || '').match(/正文：([\s\S]+?)(?:标签：|$)/)
    const tagsMatch = (content || '').match(/标签：\[(.+)\]/)

    const parsedTitle = titleMatch?.[1]?.trim() || title || '小红书笔记'
    const parsedContent = contentMatch?.[1]?.trim() || content || ''
    const parsedTags = tagsMatch?.[1]?.split(',').map((t: string) => t.trim()).filter(Boolean) || []

    // 截断正文
    const maxContentLength = 200
    const displayContent = parsedContent.length > maxContentLength
      ? parsedContent.substring(0, maxContentLength) + '...'
      : parsedContent

    // 生成标签 HTML（SVG foreignObject 不支持，改内嵌纯色块）
    const tagsStr = parsedTags.slice(0, 5).map(t => `#${t}`).join(' · ')

    // 构建 SVG 卡片（500x600，模拟小红书风格分享卡）
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="600" viewBox="0 0 500 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff5f5"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="avatar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b6b"/>
      <stop offset="100%" stop-color="#ff4757"/>
    </linearGradient>
  </defs>
  <!-- 背景 -->
  <rect width="500" height="600" rx="24" fill="url(#bg)"/>
  <rect x="20" y="20" width="460" height="560" rx="16" fill="none" stroke="#ffe0e0" stroke-width="1"/>
  <!-- 头部：头像+关注 -->
  <circle cx="60" cy="70" r="20" fill="url(#avatar)"/>
  <text x="70" y="75" font-size="16" fill="white" font-weight="bold" text-anchor="middle" font-family="Arial, sans-serif">美</text>
  <text x="95" y="75" font-size="14" fill="#333" font-weight="600" font-family="Arial, sans-serif">美食探索家</text>
  <rect x="390" y="55" width="70" height="30" rx="15" fill="#ff4757"/>
  <text x="425" y="75" font-size="12" fill="white" text-anchor="middle" font-family="Arial, sans-serif">关注</text>
  <!-- 标题 -->
  <text x="40" y="140" font-size="20" fill="#1a1a1a" font-weight="bold" font-family="Arial, sans-serif" width="420">${escapeXml(parsedTitle)}</text>
  <!-- 正文 -->
  <text x="40" y="180" font-size="14" fill="#666" line-height="1.6" font-family="Arial, sans-serif" width="420">${escapeXml(displayContent)}</text>
  <!-- 标签 -->
  ${parsedTags.length > 0 ? `<text x="40" y="520" font-size="13" fill="#ff4757" font-family="Arial, sans-serif">${escapeXml(tagsStr)}</text>` : ''}
  <!-- 底部 -->
  <line x1="40" y1="540" x2="460" y2="540" stroke="#f0f0f0" stroke-width="1"/>
  <text x="40" y="565" font-size="12" fill="#999" font-family="Arial, sans-serif">👍 0    💬 0    ⭐ 0</text>
  <text x="440" y="565" font-size="12" fill="#ff4757" font-weight="600" text-anchor="end" font-family="Arial, sans-serif">小红书</text>
</svg>`

    const base64Image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

    return {
      htmlScreenshotUrl: base64Image,
      currentStep: 'done'
    }
  } catch (error: any) {
    console.error('HTML screenshot error:', error)
    return {
      error: error.message || 'HTML 截图生成失败',
      currentStep: 'error'
    }
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
