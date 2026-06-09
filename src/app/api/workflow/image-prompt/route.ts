// src/app/api/workflow/image-prompt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callMiniMax } from '@/lib/ai/client'
import { getImagePromptGenerationPrompt } from '@/lib/ai/prompts'

export async function POST(request: NextRequest) {
  try {
    // 验证用户
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json({ success: false, error: '缺少内容' }, { status: 400 })
    }

    const response = await callMiniMax(
      getImagePromptGenerationPrompt(),
      `请根据以下笔记内容生成配图提示词：\n\n${content}`
    )

    return NextResponse.json({
      success: true,
      data: {
        imagePrompt: response.text
      }
    })
  } catch (error: any) {
    console.error('Image prompt generation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '配图提示词生成失败'
    }, { status: 500 })
  }
}
