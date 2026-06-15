// src/lib/workflow/nodes.ts

import { callMiniMax } from '../ai/client'
import { checkSensitiveWords } from '../ai/tools'
import { getTopicGenerationPrompt, getContentGenerationPrompt, getHumanizerPrompt } from '../ai/prompts'
import type { ContentWorkflowState } from './state'
import type { Topic, GeneratedContent } from '../ai/types'

// 选题生成节点
export async function topicGenerationNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  // 如果已有选题（文案生成模式），跳过选题生成
  if (state.selectedTopic) {
    console.log('Topic generation skipped, using existing selectedTopic:', state.selectedTopic)
    return { currentStep: 'topic_generation' }
  }

  try {
    const { account, searchEnabled, hotKeywords, excludeTopics } = state
    console.log('Topic generation starting, searchEnabled:', searchEnabled, 'hotKeywords:', hotKeywords?.length)

    let userMessage = `请为上述账号人设生成5个小红书选题。`
    if (excludeTopics && excludeTopics.length > 0) {
      userMessage += `\n\n请避免以下已有主题：${excludeTopics.join('、')}`
    }

    // 如果提供了热点词，添加到上下文
    let hotWordsContext = ''
    if (hotKeywords && hotKeywords.length > 0) {
      hotWordsContext = `\n\n当前小红书行业热点词：\n${hotKeywords.map((kw, i) => `${i + 1}. ${kw}`).join('\n')}`
    }

    // 如果启用了搜索，先获取搜索结果
    let searchContext = ''
    if (searchEnabled && (account.position || account.audience)) {
      try {
        const { execSync } = require('child_process')
        const keywords = [account.position, account.audience].filter(Boolean).join(' ')
        const command = `/usr/bin/mmx search query --q "${keywords} 小红书热点" --output json --quiet`
        const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
        const data = JSON.parse(output)
        const results = (data.organic || []).slice(0, 3)
        if (results.length > 0) {
          searchContext = '\n\n当前热点趋势：\n' + results.map((r: any, i: number) =>
            `${i + 1}. ${r.title}\n   ${(r.snippet || '').substring(0, 100)}`
          ).join('\n\n')
        }
      } catch (e: any) {
        console.error('Search error:', e.message)
      }
    }

    if (searchContext) {
      userMessage += searchContext
    }

    if (hotWordsContext) {
      userMessage += hotWordsContext
    }

    const response = await callMiniMax(
      getTopicGenerationPrompt(account),
      userMessage
    )
    console.log('MiniMax response received, text length:', response.text.length)
    console.log('MiniMax response text preview:', response.text.substring(0, 500))

    // 解析选题 - 支持多种格式
    const topics: Topic[] = []
    const text = response.text

    // 清理文本：移除 Markdown 标题标记
    const cleanText = text.replace(/^#{1,3}\s*主题\d+[：:]/gm, '')

    // 方法1: 匹配 "标题：xxx｜推荐理由：xxx" 格式（可能在同一行或不同行）
    // 先处理同一行的情况：标题：...｜推荐理由：...
    const sameLineRegex = /标题：([\s\S]+?)｜推荐理由：([\s\S]+?)(?=标题：|$)/g
    let match
    while ((match = sameLineRegex.exec(cleanText)) !== null && topics.length < 5) {
      const title = match[1].trim()
      const reason = match[2].trim()
      if (title && reason) {
        topics.push({ title, reason })
      }
    }

    // 方法2: 如果还没找到，尝试按行分割处理
    if (topics.length === 0) {
      const lines = cleanText.split('\n').filter((l: string) => l.trim())
      for (const line of lines) {
        // 匹配 "标题：xxx｜推荐理由：xxx" 格式
        const lineMatch = line.match(/标题：(.+?)｜推荐理由：(.+)/)
        if (lineMatch) {
          topics.push({ title: lineMatch[1].trim(), reason: lineMatch[2].trim() })
        }
        // 也支持 "标题：xxx\n推荐理由：xxx" 格式（换行分隔）
        else if (line.startsWith('标题：') && !line.includes('｜推荐理由：')) {
          const nextLineIndex = lines.indexOf(line) + 1
          if (nextLineIndex < lines.length && lines[nextLineIndex].startsWith('推荐理由：')) {
            topics.push({
              title: line.replace('标题：', '').trim(),
              reason: lines[nextLineIndex].replace('推荐理由：', '').trim()
            })
          }
        }
        // 也支持编号格式
        else if (topics.length < 5) {
          const numMatch = line.match(/^\d+[.、]\s*(.+?)[\.、]\s*(.+)/)
          if (numMatch) {
            topics.push({ title: numMatch[1].trim(), reason: numMatch[2].trim() })
          }
        }
      }
    }

    // 方法3: 如果仍然没找到，尝试更宽松的匹配
    if (topics.length === 0) {
      // 尝试提取所有 "标题：" 和 "推荐理由：" 配对
      const titleReasonPairs = cleanText.split('推荐理由：')
      for (let i = 1; i < titleReasonPairs.length && topics.length < 5; i++) {
        const titlePart = titleReasonPairs[i - 1]
        const reasonPart = titleReasonPairs[i]

        // 找到前一个标题
        const titleMatch = titlePart.match(/标题：(.+)/)
        if (titleMatch) {
          const title = titleMatch[1].split('｜')[0].trim() // 取 ｜ 前的部分
          const reason = reasonPart.split('\n')[0].trim()
          if (title && reason) {
            topics.push({ title, reason })
          }
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
      content: stripMarkdown(contentMatch?.[1]?.trim() || ''),
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
      humanizedContent: stripMarkdown(response.text),
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

// 去除 Markdown 格式标记，转为纯文本
function stripMarkdown(text: string): string {
  if (!text) return text

  return text
    // 链接 [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // **加粗** → 加粗
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // *斜体* → 斜体
    .replace(/\*([^*]+)\*/g, '$1')
    // __加粗__ → 加粗
    .replace(/__([^_]+)__/g, '$1')
    // _斜体_ → 斜体
    .replace(/(?<=\s)_([^_]+)_(?=\s)/g, '$1')
    // ~~删除线~~ → 删除线
    .replace(/~~([^~]+)~~/g, '$1')
    // `行内代码` → 行内代码
    .replace(/`([^`]+)`/g, '$1')
    // 行首 # 标题标记 → 去掉 #
    .replace(/^#{1,6}\s+/gm, '')
    // 行首 - 或 * 列表 → 去掉标记
    .replace(/^[-*]\s+/gm, '')
    // 行首数字列表 → 去掉序号
    .replace(/^\d+[.、]\s+/gm, '')
    // > 引用 → 去掉 >
    .replace(/^>\s+/gm, '')
    // 分隔线 → 去掉
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // 多余空行压缩
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
