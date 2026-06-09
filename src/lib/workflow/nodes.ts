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
      // 匹配 "标题：xxx｜推荐理由：xxx" 格式
      const match = line.match(/标题：(.+?)｜推荐理由：(.+)/)
      if (match) {
        topics.push({ title: match[1].trim(), reason: match[2].trim() })
      }
      // 也支持其他分隔符
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
      // 用户反馈模式：在原文案基础上修改
      userMessage = `请根据用户反馈修改以下文案。\n\n原文案：\n${rawContent}\n\n用户反馈：${userFeedback}\n\n请保持文案风格一致，只修改用户指出的问题，不要重新生成整篇文案。`
    } else {
      // 全新生成模式
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

    // 解析文案
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

    // 提取正文内容进行润色
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
