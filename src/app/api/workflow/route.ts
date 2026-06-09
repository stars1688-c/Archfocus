// src/app/api/workflow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { contentWorkflow } from '@/lib/workflow'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // 验证用户
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { account, topic, searchEnabled, userRequirements, selectedTopic, excludeTopics, userFeedback } = body

    if (!account) {
      return NextResponse.json({ success: false, error: '缺少账号信息' }, { status: 400 })
    }

    // 获取该账号已有的笔记标题用于去重
    let existingTitles: string[] = []
    if (account.id) {
      const existingNotes = await prisma.note.findMany({
        where: { accountId: account.id },
        select: { title: true }
      })
      existingTitles = existingNotes.map(n => n.title).filter(Boolean)
    }

    // 合并已有标题到排除列表
    const allExcludeTopics = [...(excludeTopics || []), ...existingTitles]

    // 初始化工作流状态
    const initialState = {
      account,
      topic,
      searchEnabled: searchEnabled ?? true,
      userRequirements,
      selectedTopic,
      excludeTopics: allExcludeTopics,
      userFeedback,
      currentStep: selectedTopic ? 'content_generation' : 'topic_generation'
    }

    // 运行工作流
    const result: any = await contentWorkflow.invoke(initialState)

    return NextResponse.json({
      success: !result.error,
      data: {
        topics: result.topics,
        selectedTopic: result.selectedTopic,
        rawContent: result.rawContent,
        humanizedContent: result.humanizedContent,
        sensitiveResult: result.sensitiveResult,
        currentStep: result.currentStep
      },
      error: result.error
    })
  } catch (error: any) {
    console.error('Workflow error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '工作流执行失败'
    }, { status: 500 })
  }
}
