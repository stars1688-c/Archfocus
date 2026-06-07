// src/lib/workflow/imageNodes.ts

import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { callMiniMax } from '../ai/client'
import { getImagePromptGenerationPrompt } from '../ai/prompts'
import { generateImage, ImageModel } from '../ai/image'
import { generateNoteCardHtml, type HtmlTemplateData } from './htmlTemplate'
import { htmlStyles, type HtmlStyle } from './htmlStyles'
import type { ImageWorkflowState } from './state'

// 配图提示词生成节点
export async function imagePromptGenerationNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  try {
    const { content } = state

    // 提取正文内容
    const contentMatch = (content || '').match(/正文：([\s\S]+?)(?:标签：|$)/)
    const contentText = contentMatch?.[1]?.trim() || content || ''

    const response = await callMiniMax(
      getImagePromptGenerationPrompt(),
      `请根据以下笔记内容生成配图提示词：\n\n${contentText}`
    )

    return {
      imagePrompt: response.text,
      currentStep: 'image_prompt_generation'
    }
  } catch (error: any) {
    return {
      error: error.message || '配图提示词生成失败',
      currentStep: 'error'
    }
  }
}

// AI 图像生成节点
export async function imageGenerationNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  try {
    const { imagePrompt, imageModel = 'gpt-image-2' } = state

    if (!imagePrompt) {
      throw new Error('无配图提示词')
    }

    const result = await generateImage({
      prompt: imagePrompt,
      model: imageModel as ImageModel
    })

    if (!result.success) {
      throw new Error(result.error || '图像生成失败')
    }

    return {
      generatedImageUrl: result.imageUrl || result.imageBase64,
      currentStep: 'image_generation'
    }
  } catch (error: any) {
    return {
      error: error.message || '图像生成失败',
      currentStep: 'error'
    }
  }
}

// HTML 截图节点
export async function htmlScreenshotNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  let browser: any = null

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

    // 生成 HTML
    const htmlData: HtmlTemplateData = {
      title: parsedTitle,
      content: parsedContent,
      tags: parsedTags,
      style: (htmlStyle as HtmlStyle) || 'magazine'
    }
    const html = generateNoteCardHtml(htmlData)

    // 启动浏览器并截图
    browser = await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      defaultViewport: { width: 500, height: 600 },
      executablePath: await chromium.executablePath(),
      headless: "shell"
    })

    const page = await browser.newPage()

    // 设置 HTML 内容
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // 等待字体加载
    await page.evaluateHandle('document.fonts.ready')

    // 截图
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false
    })

    // 转换为 base64
    const base64Image = `data:image/png;base64,${screenshotBuffer.toString('base64')}`

    await browser.close()

    return {
      htmlScreenshotUrl: base64Image,
      currentStep: 'done'
    }
  } catch (error: any) {
    if (browser) {
      await browser.close().catch(() => {})
    }
    console.error('HTML screenshot error:', error)
    return {
      error: error.message || 'HTML 截图生成失败',
      currentStep: 'error'
    }
  }
}
