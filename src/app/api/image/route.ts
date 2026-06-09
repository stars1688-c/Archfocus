// src/app/api/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { generateImage, ImageModel } from '@/lib/ai/image'

export async function POST(request: NextRequest) {
  try {
    // 验证用户
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, model = 'gpt-image-2', size, quality, n } = body

    if (!prompt) {
      return NextResponse.json({ success: false, error: '缺少提示词' }, { status: 400 })
    }

    const result = await generateImage({
      prompt,
      model: model as ImageModel,
      size,
      n
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          imageUrl: result.imageUrl,
          imageBase64: result.imageBase64
        }
      })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Image generation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '图像生成失败'
    }, { status: 500 })
  }
}
