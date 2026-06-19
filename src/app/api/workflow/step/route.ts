import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { contentGenerationNode, humanizerNode, sensitiveCheckNode } from '@/lib/workflow'
import type { ContentWorkflowState } from '@/lib/workflow/state'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/workflow/step - 运行单个工作流步骤（用于分步执行，显示真实进度）
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { step, state } = body

    if (!step) {
      return NextResponse.json({ success: false, error: '缺少步骤名称' }, { status: 400 })
    }

    let result: Partial<ContentWorkflowState> = {}

    switch (step) {
      case 'content_generation': {
        // 运行文案生成节点
        const { account, selectedTopic, userRequirements, searchResults, userFeedback, rawContent } = state || {}
        if (!account || !selectedTopic) {
          return NextResponse.json({ success: false, error: '缺少账号或主题信息' }, { status: 400 })
        }

        result = await contentGenerationNode({
          account,
          selectedTopic,
          userRequirements,
          searchResults,
          userFeedback,
          rawContent,
          searchEnabled: false,
          currentStep: 'content_generation',
        } as any)
        break
      }

      case 'humanization': {
        // 运行去AI味节点
        const { rawContent: raw } = state || {}
        if (!raw) {
          return NextResponse.json({ success: false, error: '缺少原始文案' }, { status: 400 })
        }

        result = await humanizerNode({
          rawContent: raw,
          searchEnabled: false,
          currentStep: 'humanization',
        } as any)
        break
      }

      case 'sensitive_check': {
        // 运行敏感词检测节点
        const { humanizedContent: humanized } = state || {}
        if (!humanized) {
          return NextResponse.json({ success: false, error: '缺少待检测文案' }, { status: 400 })
        }

        result = await sensitiveCheckNode({
          humanizedContent: humanized,
          searchEnabled: false,
          currentStep: 'sensitive_check',
        } as any)
        break
      }

      default:
        return NextResponse.json({ success: false, error: `未知步骤: ${step}` }, { status: 400 })
    }

    return NextResponse.json({
      success: !result.error,
      data: {
        ...result,
        currentStep: result.currentStep || step,
      },
      error: result.error,
    })
  } catch (error: any) {
    console.error('Workflow step error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '工作流步骤执行失败',
    }, { status: 500 })
  }
}
