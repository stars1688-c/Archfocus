// src/lib/workflow/imageNodes.ts

import { callMiniMax } from '../ai/client'
import { getImagePromptGenerationPrompt } from '../ai/prompts'
import { generateImage, ImageModel } from '../ai/image'
import type { ImageWorkflowState, StepLog } from './state'
import { createStepLog } from './state'
import { logStepStart, logStepSuccess, logStepError, logStepSkipped, logInfo, logWarn } from './logger'
import { generateVisualAsset } from './visualAsset'
import { createPageLayouts } from './pageLayout'
import { renderAllPages } from './svgRenderer'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// 配图提示词生成节点
export async function imagePromptGenerationNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = '配图提示词'
  const stepStart = new Date().toISOString()
  logStepStart(stepName)

  try {
    const { content, imagePrompt } = state

    // 如果已有提示词（用户已确认），直接使用不重新生成
    if (imagePrompt) {
      logStepSkipped(stepName, '已有提示词，跳过生成')
      const skipLog = createStepLog(stepName, 'skipped', '已有配图提示词，跳过', stepStart)
      return {
        imagePrompt,
        currentStep: 'image_prompt_generation',
        stepLogs: [...logs, skipLog]
      }
    }

    // 提取标题和正文
    const titleMatch = (content || '').match(/标题：(.+)/)
    const contentMatch = (content || '').match(/正文：([\s\S]+?)(?:标签：|$)/)
    const noteTitle = titleMatch?.[1]?.trim() || state.title || ''
    const contentText = contentMatch?.[1]?.trim() || content || ''
    logInfo(stepName, `内容长度: ${contentText.length}字`)

    logInfo(stepName, '调用 MiniMax API...')
    const apiStart = Date.now()
    const response = await callMiniMax(
      getImagePromptGenerationPrompt(),
      `请根据以下笔记内容生成配图提示词：\n\n标题：${noteTitle}\n正文：${contentText}`
    )
    const apiDuration = Date.now() - apiStart
    logInfo(stepName, `提示词生成完成（${apiDuration}ms）`)

    const successLog = createStepLog(stepName, 'success', `配图提示词生成完成（${apiDuration}ms）`, stepStart)
    return {
      imagePrompt: response.text,
      currentStep: 'image_prompt_generation',
      stepLogs: [...logs, successLog]
    }
  } catch (error: any) {
    logStepError(stepName, error.message || '配图提示词生成失败', Date.now() - new Date(stepStart).getTime())
    const errorLog = createStepLog(stepName, 'error', error.message || '配图提示词生成失败', stepStart)
    return {
      error: error.message || '配图提示词生成失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog]
    }
  }
}

// AI 图像生成节点
// 策略：AI 生成纯视觉背景图（不含文字），再用 SVG 叠加中文标题和正文
// 因为图片模型无法正确渲染中文文字，叠加 SVG 文字保证清晰可读
export async function imageGenerationNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = 'AI 配图'
  const stepStart = new Date().toISOString()
  logStepStart(stepName)

  try {
    const { imagePrompt, imageModel = 'gpt-image-2', content, title } = state

    if (!imagePrompt) {
      throw new Error('无配图提示词')
    }

    logInfo(stepName, `模型: ${imageModel}`)
    const genStart = Date.now()
    const result = await generateImage({
      prompt: imagePrompt,
      model: imageModel as ImageModel
    })
    const genDuration = Date.now() - genStart

    if (!result.success) {
      throw new Error(result.error || '图像生成失败')
    }

    const aiImageUrl = result.imageUrl || result.imageBase64 || ''

    // 解析文案内容，用于 SVG 文字叠加
    const titleMatch = (content || '').match(/标题：(.+)/)
    const contentMatch = (content || '').match(/正文：([\s\S]+?)(?:标签：|$)/)
    const tagsMatch = (content || '').match(/标签：\[(.+)\]/)
    const tagsFullMatch = (content || '').match(/标签：(.+)/)

    const parsedTitle = titleMatch?.[1]?.trim() || title || '小红书笔记'
    const parsedContent = contentMatch?.[1]?.trim() || content || ''
    const parsedTags = tagsMatch?.[1]?.split(',').map((t: string) => t.trim()).filter(Boolean)
      || tagsFullMatch?.[1]?.split(',').map((t: string) => t.trim()).filter(Boolean)
      || []

    // 截断正文显示
    const maxContentLength = 150
    const displayContent = parsedContent.length > maxContentLength
      ? parsedContent.substring(0, maxContentLength) + '...'
      : parsedContent

    // 截断标题显示
    const displayTitle = parsedTitle.length > 30
      ? parsedTitle.substring(0, 30) + '...'
      : parsedTitle

    // 标签文本
    const tagsStr = parsedTags.slice(0, 5).map(t => `#${t}`).join('  ')

    // 构建 SVG: AI 图片为背景 + 中文文字叠加
    // SVG 尺寸 500x700 ≈ 3:4 竖版，适配小红书信息流
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="500" height="700" viewBox="0 0 500 700">
  <defs>
    <!-- 底部渐变遮罩，让文字更清晰 -->
    <linearGradient id="textOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="55%" stop-color="rgba(0,0,0,0.35)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.75)"/>
    </linearGradient>
    <!-- 顶部微渐变 -->
    <linearGradient id="topOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.2)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
  </defs>
  <!-- AI 生成的背景图 -->
  ${aiImageUrl ? `<image href="${escapeXml(aiImageUrl)}" x="0" y="0" width="500" height="700" preserveAspectRatio="xMidYMid slice"/>` : ''}
  <!-- 顶部微渐变 -->
  <rect x="0" y="0" width="500" height="120" fill="url(#topOverlay)"/>
  <!-- 底部文字遮罩 -->
  <rect x="0" y="300" width="500" height="400" fill="url(#textOverlay)"/>
  <!-- 标题 -->
  <text x="30" y="480" font-size="22" fill="white" font-weight="bold" font-family="'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif" width="440">${escapeXml(displayTitle)}</text>
  <!-- 正文摘要 -->
  <text x="30" y="520" font-size="15" fill="rgba(255,255,255,0.9)" font-family="'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif" width="440">${escapeXml(displayContent)}</text>
  <!-- 标签 -->
  ${parsedTags.length > 0 ? `<text x="30" y="650" font-size="14" fill="rgba(255,255,255,0.7)" font-family="'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif">${escapeXml(tagsStr)}</text>` : ''}
  <!-- 底部品牌标识 -->
  <text x="440" y="670" font-size="12" fill="rgba(255,255,255,0.4)" text-anchor="end" font-family="Arial, sans-serif">ArchFocus</text>
</svg>`

    const base64Image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

    logStepSuccess(stepName, `图片生成完成（含文字叠加）`, genDuration)
    const successLog = createStepLog(stepName, 'success', `AI 配图生成完成（${genDuration}ms）`, stepStart)

    return {
      generatedImageUrl: base64Image,
      currentStep: 'image_generation',
      stepLogs: [...logs, successLog]
    }
  } catch (error: any) {
    logStepError(stepName, error.message || '图像生成失败', Date.now() - new Date(stepStart).getTime())
    const errorLog = createStepLog(stepName, 'error', error.message || '图像生成失败', stepStart)
    return {
      error: error.message || '图像生成失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog]
    }
  }
}

// HTML 截图节点 — 使用视觉资产生成器生成多页 3:4 竖版 SVG 卡片
export async function htmlScreenshotNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = 'HTML 截图'
  const stepStart = new Date().toISOString()

  try {
    const { content, title, htmlStyle = 'magazine' } = state

    if (!content) {
      throw new Error('无内容用于生成截图')
    }

    const asset = await generateVisualAsset({
      content,
      title: title || '',
      tags: [],
      style: htmlStyle as any,
      enableSearch: true,
    })

    const layouts = createPageLayouts(content, title || '', asset)

    const urls = renderAllPages(layouts, asset)

    const successLog = createStepLog(stepName, 'success', `HTML 截图生成完成（${urls.length} 张）`, stepStart)

    return {
      htmlScreenshotUrls: urls,
      htmlScreenshotUrl: urls[0],
      currentStep: 'done',
      stepLogs: [...logs, successLog],
    }
  } catch (error: any) {
    const errorLog = createStepLog(stepName, 'error', error.message || '截图生成失败', stepStart)
    return {
      error: error.message || '截图生成失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog],
    }
  }
}
