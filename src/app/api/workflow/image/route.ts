// src/app/api/workflow/image/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { imageWorkflow, type ImageGenerationType } from '@/lib/workflow'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { content, title, imageType = 'ai_prompt', imageModel, imagePrompt } = body

    if (!content) {
      return NextResponse.json({ success: false, error: '缺少内容' }, { status: 400 })
    }

    if (!['ai_prompt', 'html_screenshot'].includes(imageType)) {
      return NextResponse.json({ success: false, error: '无效的配图类型' }, { status: 400 })
    }

    // 如果已提供提示词，直接进入图片生成阶段
    const initialState = {
      content,
      title,
      imageType: imageType as ImageGenerationType,
      imageModel,
      imagePrompt: imagePrompt || undefined,
      currentStep: imagePrompt ? 'image_generation' : 'image_prompt_generation'
    }

    // 运行配图生成工作流
    const result: any = await imageWorkflow.invoke(initialState)

    return NextResponse.json({
      success: !result.error,
      data: {
        imagePrompt: result.imagePrompt,
        generatedImageUrl: result.generatedImageUrl,
        htmlScreenshotUrl: result.htmlScreenshotUrl,
        currentStep: result.currentStep
      },
      error: result.error
    })
  } catch (error: any) {
    console.error('Image workflow error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '配图生成工作流执行失败'
    }, { status: 500 })
  }
}
