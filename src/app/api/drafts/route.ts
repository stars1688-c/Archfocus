import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/drafts - 获取当前账号的草稿
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ success: false, error: '缺少账号ID' }, { status: 400 })
    }

    // 验证账号属于当前用户
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }

    const draft = await prisma.draft.findUnique({
      where: { accountId },
    })

    return NextResponse.json({ success: true, data: draft })
  } catch (error) {
    console.error('Get draft error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// POST /api/drafts - 保存草稿
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { accountId, title, content, rawContent, humanizedContent, imagePrompt, imageType, htmlStyle, imageModel, step } = body

    if (!accountId) {
      return NextResponse.json({ success: false, error: '缺少账号ID' }, { status: 400 })
    }

    // 验证账号属于当前用户
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }

    // UPSERT: 有则更新，无则创建
    const draft = await prisma.draft.upsert({
      where: { accountId },
      update: {
        title: title ?? '',
        content: content ?? '',
        rawContent: rawContent ?? '',
        humanizedContent: humanizedContent ?? '',
        imagePrompt: imagePrompt ?? '',
        imageType: imageType ?? 'ai_prompt',
        htmlStyle: htmlStyle ?? 'magazine',
        imageModel: imageModel ?? 'minimax-image-01',
        step: step ?? 0,
      },
      create: {
        accountId,
        title: title ?? '',
        content: content ?? '',
        rawContent: rawContent ?? '',
        humanizedContent: humanizedContent ?? '',
        imagePrompt: imagePrompt ?? '',
        imageType: imageType ?? 'ai_prompt',
        htmlStyle: htmlStyle ?? 'magazine',
        imageModel: imageModel ?? 'minimax-image-01',
        step: step ?? 0,
      },
    })

    return NextResponse.json({ success: true, data: draft })
  } catch (error) {
    console.error('Save draft error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}

// DELETE /api/drafts - 删除草稿（发布后清除）
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ success: false, error: '缺少账号ID' }, { status: 400 })
    }

    // 验证账号属于当前用户
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 })
    }

    await prisma.draft.delete({ where: { accountId } }).catch(() => {})

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error('Delete draft error:', error)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
