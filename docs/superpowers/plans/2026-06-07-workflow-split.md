# 工作流拆分计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将现有的单一工作流拆分为两个独立工作流——文案生成工作流和配图生成工作流

**架构：**
- **文案生成工作流**：选题生成 → 文案生成 → 润色 → 敏感词检测（4个节点）
- **配图生成工作流**：配图生成（支持两种类型：AI提示词生成、HTML截图生成）

**技术栈：** LangGraph StateGraph, MiniMax API, Apimart API, Puppeteer/html2canvas

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| 修改 | `src/lib/workflow/state.ts` | 拆分状态类型为 ContentWorkflowState 和 ImageWorkflowState |
| 重写 | `src/lib/workflow/graph.ts` | 删除旧工作流，创建两个新工作流图 |
| 修改 | `src/lib/workflow/nodes.ts` | 拆分节点到 contentNodes 和 imageNodes |
| 修改 | `src/lib/workflow/index.ts` | 导出两个工作流 |
| 修改 | `src/app/api/workflow/route.ts` | 改为调用文案生成工作流 |
| 创建 | `src/app/api/workflow/image/route.ts` | 配图生成工作流 API |

---

## 任务 1：拆分状态类型

**文件：**
- 修改：`src/lib/workflow/state.ts`

- [ ] **步骤 1：更新 state.ts - 添加 ImageWorkflowState 类型**

```typescript
// src/lib/workflow/state.ts

import type { Account, Topic, SensitiveWordResult } from '../ai/types'

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
  userRequirements?: string
  excludeTopics?: string[]
  userFeedback?: string

  // 流程控制
  currentStep: ContentWorkflowStep
}

// 配图生成类型
export type ImageGenerationType = 'ai_prompt' | 'html_screenshot'

// 配图生成工作流步骤
export type ImageWorkflowStep = 'image_prompt_generation' | 'image_generation' | 'html_screenshot' | 'done' | 'error'

// 配图生成工作流状态
export interface ImageWorkflowState {
  // 输入
  content: string  // 文案内容
  title?: string   // 标题（用于HTML截图）

  // 中间状态
  imagePrompt?: string
  generatedImageUrl?: string
  htmlScreenshotUrl?: string
  error?: string

  // 配置
  imageType: ImageGenerationType
  imageModel?: 'gpt-image-2' | 'doubao-seedream-5-0-lite'

  // 流程控制
  currentStep: ImageWorkflowStep
}
```

- [ ] **步骤 2：运行 TypeScript 检查**

运行：`npx tsc --noEmit src/lib/workflow/state.ts`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/workflow/state.ts
git commit -m "feat: 拆分工作流状态类型为 ContentWorkflowState 和 ImageWorkflowState"
```

---

## 任务 2：创建文案生成工作流图

**文件：**
- 修改：`src/lib/workflow/graph.ts`

- [ ] **步骤 1：更新 graph.ts - 实现内容生成工作流**

```typescript
// src/lib/workflow/graph.ts

import { StateGraph, Annotation, END, START } from '@langchain/langgraph'
import type { ContentWorkflowState, ImageWorkflowState } from './state'
import { topicGenerationNode, contentGenerationNode, humanizerNode, sensitiveCheckNode } from './nodes'

// ============================================
// 文案生成工作流
// ============================================

const ContentWorkflowAnnotation = Annotation.Root({
  // 输入
  account: Annotation<any>,
  topic: Annotation<string | undefined>,

  // 中间状态
  topics: Annotation<any[] | undefined>,
  selectedTopic: Annotation<string | undefined>,
  searchResults: Annotation<string[] | undefined>,
  rawContent: Annotation<string | undefined>,
  humanizedContent: Annotation<string | undefined>,
  sensitiveResult: Annotation<any | undefined>,

  // 配置
  searchEnabled: Annotation<boolean>,
  userRequirements: Annotation<string | undefined>,
  excludeTopics: Annotation<string[] | undefined>,
  userFeedback: Annotation<string | undefined>,

  // 流程控制
  currentStep: Annotation<string>,
})

function contentShouldContinue(state: any): string {
  switch (state.currentStep) {
    case 'topic_generation':
      return 'contentGeneration'
    case 'content_generation':
      return 'humanization'
    case 'humanization':
      return 'sensitiveCheck'
    case 'sensitive_check':
      return END
    case 'done':
    case 'error':
      return END
    default:
      return END
  }
}

const contentWorkflow = new StateGraph(ContentWorkflowAnnotation)
  .addNode('topicGeneration', topicGenerationNode)
  .addNode('contentGeneration', contentGenerationNode)
  .addNode('humanization', humanizerNode)
  .addNode('sensitiveCheck', sensitiveCheckNode)
  .addEdge(START, 'topicGeneration')
  .addEdge('topicGeneration', 'contentGeneration')
  .addEdge('contentGeneration', 'humanization')
  .addEdge('humanization', 'sensitiveCheck')
  .addConditionalEdges('sensitiveCheck', contentShouldContinue)
  .compile()

export { contentWorkflow }
```

- [ ] **步骤 2：运行 TypeScript 检查**

运行：`npx tsc --noEmit src/lib/workflow/graph.ts`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/workflow/graph.ts
git commit -m "feat: 创建文案生成工作流 graph"
```

---

## 任务 3：拆分节点到内容节点

**文件：**
- 修改：`src/lib/workflow/nodes.ts`

- [ ] **步骤 1：更新 nodes.ts - 将内容相关节点保留，移除图像节点**

```typescript
// src/lib/workflow/nodes.ts
import { callMiniMax } from '../ai/client'
import { checkSensitiveWords } from '../ai/tools'
import { getTopicGenerationPrompt, getContentGenerationPrompt, getHumanizerPrompt } from '../ai/prompts'
import type { ContentWorkflowState } from './state'
import type { Topic, GeneratedContent } from '../ai/types'

// 选题生成节点
export async function topicGenerationNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  try {
    const { account, searchEnabled, excludeTopics } = state

    let userMessage = `请为上述账号人设生成5个小红书选题。`
    if (excludeTopics && excludeTopics.length > 0) {
      userMessage += `\n\n请避免以下已有主题：${excludeTopics.join('、')}`
    }
    if (searchEnabled) {
      userMessage += `\n\n请先联网搜索相关热点话题。`
    }

    const tools = searchEnabled ? [{
      type: 'web_search' as const,
      name: 'web_search',
      description: '搜索互联网获取最新信息',
      params: {
        type: 'object' as const,
        properties: {
          query: { type: 'string' as const, description: '搜索关键词' }
        },
        required: ['query']
      }
    }] : undefined

    const response = await callMiniMax(
      getTopicGenerationPrompt(account),
      userMessage,
      { tools }
    )

    // 解析选题
    const topics: Topic[] = []
    const lines = response.text.split('\n').filter((l: string) => l.trim())
    for (const line of lines) {
      const match = line.match(/标题：(.+?)｜推荐理由：(.+)/)
      if (match) {
        topics.push({ title: match[1].trim(), reason: match[2].trim() })
      }
      if (topics.length < 5) {
        const altMatch = line.match(/^\d+[.、]\s*(.+?)[\.、]\s*(.+)/)
        if (altMatch) {
          topics.push({ title: altMatch[1].trim(), reason: altMatch[2].trim() })
        }
      }
    }

    return {
      topics: topics.slice(0, 5),
      currentStep: 'topic_generation'
    }
  } catch (error: any) {
    return {
      error: error.message || '选题生成失败',
      currentStep: 'error'
    }
  }
}

// 文案生成节点
export async function contentGenerationNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  try {
    const { account, selectedTopic, searchResults, userRequirements, userFeedback, rawContent } = state

    if (!selectedTopic) {
      throw new Error('未选择主题')
    }

    let userMessage: string

    if (userFeedback && rawContent) {
      userMessage = `请根据用户反馈修改以下文案。\n\n原文案：\n${rawContent}\n\n用户反馈：${userFeedback}\n\n请保持文案风格一致，只修改用户指出的问题，不要重新生成整篇文案。`
    } else {
      userMessage = `请根据以下主题创作小红书笔记：${selectedTopic}`
      if (userRequirements) {
        userMessage += `\n\n用户要求：${userRequirements}`
      }
      if (searchResults && searchResults.length > 0) {
        userMessage += `\n\n参考搜索结果：${searchResults.join('\n')}`
      }
    }

    const response = await callMiniMax(
      getContentGenerationPrompt(account),
      userMessage
    )

    const text = response.text
    const titleMatch = text.match(/标题：(.+)/)
    const contentMatch = text.match(/正文：([\s\S]+?)(?:标签：|$)/)
    const tagsMatch = text.match(/标签：\[(.+)\]/)

    const content: GeneratedContent = {
      title: titleMatch?.[1]?.trim() || selectedTopic,
      content: contentMatch?.[1]?.trim() || '',
      tags: tagsMatch?.[1]?.split(',').map((t: string) => t.trim()).filter(Boolean) || []
    }

    return {
      rawContent: `标题：${content.title}\n正文：${content.content}\n标签：[${content.tags.join(', ')}]`,
      currentStep: 'content_generation'
    }
  } catch (error: any) {
    return {
      error: error.message || '文案生成失败',
      currentStep: 'error'
    }
  }
}

// 去AI味节点
export async function humanizerNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  try {
    const { rawContent } = state

    if (!rawContent) {
      throw new Error('无原始文案')
    }

    const contentMatch = rawContent.match(/正文：([\s\S]+?)(?:标签：|$)/)
    const originalBody = contentMatch?.[1]?.trim() || rawContent

    const response = await callMiniMax(
      getHumanizerPrompt(),
      `请对以下文案进行去AI化润色：\n\n${originalBody}`
    )

    return {
      humanizedContent: response.text,
      currentStep: 'humanization'
    }
  } catch (error: any) {
    return {
      error: error.message || '润色失败',
      currentStep: 'error'
    }
  }
}

// 敏感词检测节点
export async function sensitiveCheckNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  try {
    const { humanizedContent } = state

    if (!humanizedContent) {
      throw new Error('无待检测文案')
    }

    const result = await checkSensitiveWords(humanizedContent)

    return {
      sensitiveResult: {
        passed: result.passed,
        illegalWords: result.illegalWords
      },
      currentStep: result.passed ? 'done' : 'sensitive_check'
    }
  } catch (error: any) {
    return {
      error: error.message || '敏感词检测失败',
      currentStep: 'error'
    }
  }
}
```

- [ ] **步骤 2：运行 TypeScript 检查**

运行：`npx tsc --noEmit src/lib/workflow/nodes.ts`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/workflow/nodes.ts
git commit -m "feat: 拆分文案生成节点（移除图像节点）"
```

---

## 任务 4：创建图像生成节点

**文件：**
- 创建：`src/lib/workflow/imageNodes.ts`

- [ ] **步骤 1：创建 imageNodes.ts - 配图生成节点**

```typescript
// src/lib/workflow/imageNodes.ts
import { callMiniMax } from '../ai/client'
import { getImagePromptGenerationPrompt } from '../ai/prompts'
import { generateImage, ImageModel } from '../ai/image'
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
  try {
    const { content, title } = state

    if (!content) {
      throw new Error('无内容用于生成截图')
    }

    // TODO: 实现 HTML 截图功能
    // 可以使用 Puppeteer、html2canvas 或第三方服务
    // 这里先返回错误，后续实现

    return {
      error: 'HTML 截图功能待实现',
      currentStep: 'error'
    }
  } catch (error: any) {
    return {
      error: error.message || 'HTML 截图生成失败',
      currentStep: 'error'
    }
  }
}
```

- [ ] **步骤 2：运行 TypeScript 检查**

运行：`npx tsc --noEmit src/lib/workflow/imageNodes.ts`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/workflow/imageNodes.ts
git commit -m "feat: 创建图像生成节点"
```

---

## 任务 5：创建配图生成工作流图

**文件：**
- 修改：`src/lib/workflow/graph.ts`（添加配图工作流）

- [ ] **步骤 1：更新 graph.ts - 添加配图生成工作流**

```typescript
// src/lib/workflow/graph.ts

import { StateGraph, Annotation, END, START } from '@langchain/langgraph'
import { contentWorkflow } from './graph'
import { imagePromptGenerationNode, imageGenerationNode, htmlScreenshotNode } from './imageNodes'
import type { ImageWorkflowState } from './state'

// ============================================
// 配图生成工作流
// ============================================

const ImageWorkflowAnnotation = Annotation.Root({
  // 输入
  content: Annotation<string>,
  title: Annotation<string | undefined>,

  // 中间状态
  imagePrompt: Annotation<string | undefined>,
  generatedImageUrl: Annotation<string | undefined>,
  htmlScreenshotUrl: Annotation<string | undefined>,

  // 配置
  imageType: Annotation<string>,
  imageModel: Annotation<string | undefined>,

  // 流程控制
  currentStep: Annotation<string>,
})

function imageShouldContinue(state: any): string {
  switch (state.currentStep) {
    case 'image_prompt_generation':
      return state.imageType === 'ai_prompt' ? 'imageGeneration' : 'htmlScreenshot'
    case 'image_generation':
    case 'htmlScreenshot':
      return END
    case 'done':
    case 'error':
      return END
    default:
      return END
  }
}

const imageWorkflow = new StateGraph(ImageWorkflowAnnotation)
  .addNode('imagePromptGeneration', imagePromptGenerationNode)
  .addNode('imageGeneration', imageGenerationNode)
  .addNode('htmlScreenshot', htmlScreenshotNode)
  .addEdge(START, 'imagePromptGeneration')
  .addConditionalEdges('imagePromptGeneration', imageShouldContinue)
  .addConditionalEdges('imageGeneration', imageShouldContinue)
  .addConditionalEdges('htmlScreenshot', imageShouldContinue)
  .compile()

export { imageWorkflow }
```

- [ ] **步骤 2：运行 TypeScript 检查**

运行：`npx tsc --noEmit src/lib/workflow/graph.ts`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/workflow/graph.ts
git commit -m "feat: 创建配图生成工作流"
```

---

## 任务 6：更新 workflow index.ts

**文件：**
- 修改：`src/lib/workflow/index.ts`

- [ ] **步骤 1：更新 index.ts - 导出两个工作流**

```typescript
// src/lib/workflow/index.ts

// 文案生成工作流
export { contentWorkflow } from './graph'
export type { ContentWorkflowState, ContentWorkflowStep } from './state'

// 配图生成工作流
export { imageWorkflow } from './graph'
export type { ImageWorkflowState, ImageWorkflowStep, ImageGenerationType } from './state'

// 文案节点
export {
  topicGenerationNode,
  contentGenerationNode,
  humanizerNode,
  sensitiveCheckNode
} from './nodes'

// 配图节点
export {
  imagePromptGenerationNode,
  imageGenerationNode,
  htmlScreenshotNode
} from './imageNodes'
```

- [ ] **步骤 2：运行 TypeScript 检查**

运行：`npx tsc --noEmit src/lib/workflow/index.ts`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/workflow/index.ts
git commit -m "feat: 导出两个独立工作流"
```

---

## 任务 7：更新文案生成 API

**文件：**
- 修改：`src/app/api/workflow/route.ts`

- [ ] **步骤 1：更新 API - 确保调用文案生成工作流**

```typescript
// src/app/api/workflow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { contentWorkflow } from '@/lib/workflow'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
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

    const allExcludeTopics = [...(excludeTopics || []), ...existingTitles]

    // 初始化文案生成工作流状态
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

    // 运行文案生成工作流
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
    console.error('Content workflow error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '文案生成工作流执行失败'
    }, { status: 500 })
  }
}
```

- [ ] **步骤 2：测试 API 路由**

运行：`npm run build 2>&1 | tail -30`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/workflow/route.ts
git commit -m "feat: 更新文案生成 API"
```

---

## 任务 8：创建配图生成 API

**文件：**
- 创建：`src/app/api/workflow/image/route.ts`

- [ ] **步骤 1：创建配图生成 API**

```typescript
// src/app/api/workflow/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { imageWorkflow } from '@/lib/workflow'
import type { ImageGenerationType } from '@/lib/workflow'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { content, title, imageType = 'ai_prompt', imageModel } = body

    if (!content) {
      return NextResponse.json({ success: false, error: '缺少内容' }, { status: 400 })
    }

    if (!['ai_prompt', 'html_screenshot'].includes(imageType)) {
      return NextResponse.json({ success: false, error: '无效的配图类型' }, { status: 400 })
    }

    // 初始化配图生成工作流状态
    const initialState = {
      content,
      title,
      imageType: imageType as ImageGenerationType,
      imageModel,
      currentStep: 'image_prompt_generation'
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
```

- [ ] **步骤 2：运行构建验证**

运行：`npm run build 2>&1 | tail -30`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/workflow/image/route.ts
git commit -m "feat: 创建配图生成工作流 API"
```

---

## 验证清单

完成所有任务后，运行以下验证：

```bash
# 1. TypeScript 检查
npx tsc --noEmit

# 2. 构建检查
npm run build

# 3. 验证文件结构
ls -la src/lib/workflow/
ls -la src/app/api/workflow/
```

---

## 下一步

1. HTML 截图功能实现（任务 4 中的占位符）
2. 前端页面更新以支持两个独立工作流
