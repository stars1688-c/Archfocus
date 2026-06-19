// src/lib/workflow/nodes.ts

import { callMiniMax } from '../ai/client'
import { checkSensitiveWords } from '../ai/tools'
import { getTopicGenerationPrompt, getContentGenerationPrompt, getHumanizerPrompt } from '../ai/prompts'
import type { ContentWorkflowState, StepLog } from './state'
import { createStepLog } from './state'
import type { Topic, GeneratedContent } from '../ai/types'
import { logStepStart, logStepSuccess, logStepError, logStepSkipped, logInfo, logWarn } from './logger'

// 选题生成节点
export async function topicGenerationNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = '选题生成'

  // 如果已有选题（文案生成模式），跳过选题生成
  if (state.selectedTopic) {
    const skipLog = createStepLog(stepName, 'skipped', `已存在选题「${state.selectedTopic}」，跳过`)
    logStepSkipped(stepName, `已有选题「${state.selectedTopic?.substring(0, 30)}」`)
    return { currentStep: 'topic_generation', stepLogs: [...logs, skipLog] }
  }

  const stepStart = new Date().toISOString()
  logStepStart(stepName)

  try {
    const { account, searchEnabled, hotKeywords, excludeTopics } = state
    logInfo(stepName, `searchEnabled=${searchEnabled}, hotKeywords=${hotKeywords?.length || 0}`)

    // 收集上下文，注入到 System Prompt 中
    let searchContext = ''
    let hotWordsContext = ''
    let searchLog = ''

    // 如果启用了搜索，获取搜索结果
    if (searchEnabled && (account.position || account.audience)) {
      const searchStart = Date.now()
      logInfo(stepName, '开始联网搜索...')
      try {
        const { execSync } = require('child_process')
        const keywords = [account.position, account.audience].filter(Boolean).join(' ')
        const command = `/usr/bin/mmx search query --q "${keywords} 小红书热点" --output json --quiet`
        const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
        const data = JSON.parse(output)
        const results = (data.organic || []).slice(0, 3)
        if (results.length > 0) {
          searchContext = results.map((r: any, i: number) =>
            `${i + 1}. ${r.title}\n   ${(r.snippet || '').substring(0, 100)}`
          ).join('\n\n')
          searchLog = `搜索到 ${results.length} 条热点（${Date.now() - searchStart}ms）`
        } else {
          searchLog = `联网搜索无结果（${Date.now() - searchStart}ms）`
        }
      } catch (e: any) {
        searchLog = `联网搜索失败: ${e.message}`
        logWarn(stepName, `搜索错误: ${e.message}`)
      }
      logInfo(stepName, searchLog)
    }

    // 处理热点词
    if (hotKeywords && hotKeywords.length > 0) {
      hotWordsContext = hotKeywords.map((kw, i) => `${i + 1}. ${kw}`).join('\n')
      logInfo(stepName, `热点词: ${hotKeywords.join(', ')}`)
    }

    // 构建 System Prompt（含所有上下文）
    const systemPrompt = getTopicGenerationPrompt(account, {
      searchContext: searchContext || undefined,
      hotWordsContext: hotWordsContext || undefined,
      excludeTopics: excludeTopics && excludeTopics.length > 0 ? excludeTopics : undefined
    })

    // User Message 保持简洁
    const userMessage = `请为上述账号人设生成5个小红书选题。`

    logInfo(stepName, '调用 MiniMax API...')
    const apiStart = Date.now()
    const response = await callMiniMax(
      systemPrompt,
      userMessage
    )
    const apiDuration = Date.now() - apiStart
    logInfo(stepName, `MiniMax 返回（${apiDuration}ms），文本长度: ${response.text.length}`)
    logInfo(stepName, `内容预览: ${response.text.substring(0, 200)}`)

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

    // 过滤超长标题（>20字），不进行硬截断
    const validTopics = topics.filter(t => t.title.length <= 20)
    const rejectedCount = topics.length - validTopics.length
    if (rejectedCount > 0) {
      logWarn(stepName, `${rejectedCount} 个标题超20字被丢弃`)
    }

    const finalTopics = validTopics.slice(0, 5).map(t => ({
      title: t.title,
      reason: t.reason.length > 50 ? t.reason.slice(0, 50) : t.reason
    }))

    if (finalTopics.length === 0) {
      throw new Error('所有标题均超过20字，请重新生成')
    }

    const topicsCount = finalTopics.length
    const successLog = createStepLog(stepName, 'success', `生成 ${topicsCount} 个选题（miniMax ${apiDuration}ms）`, stepStart)
    logStepSuccess(stepName, `生成 ${topicsCount} 个选题`, apiDuration)

    return {
      topics: finalTopics,
      currentStep: 'topic_generation',
      stepLogs: [...logs, successLog]
    }
  } catch (error: any) {
    logStepError(stepName, error.message || '选题生成失败', Date.now() - new Date(stepStart).getTime())
    const errorLog = createStepLog(stepName, 'error', error.message || '选题生成失败', stepStart)
    return {
      error: error.message || '选题生成失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog]
    }
  }
}

// 文案生成节点
export async function contentGenerationNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = '文案生成'
  const stepStart = new Date().toISOString()
  logStepStart(stepName)

  try {
    const { account, selectedTopic, searchResults, userRequirements, userFeedback, rawContent } = state

    if (!selectedTopic) {
      throw new Error('未选择主题')
    }

    let userMessage: string
    const mode = userFeedback && rawContent ? '修改' : '全新生成'
    logInfo(stepName, `模式: ${mode}, 选题: ${selectedTopic.substring(0, 30)}`)

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

    logInfo(stepName, '调用 MiniMax API...')
    const apiStart = Date.now()
    const response = await callMiniMax(
      getContentGenerationPrompt(account),
      userMessage
    )
    const apiDuration = Date.now() - apiStart
    logInfo(stepName, `MiniMax 返回（${apiDuration}ms），文本长度: ${response.text.length}`)

    // 解析文案
    const text = response.text
    const titleMatch = text.match(/标题：(.+)/)
    const contentMatch = text.match(/正文：([\s\S]+?)(?:标签：|$)/)
    const tagsMatch = text.match(/标签：\[(.+)\]/)

    const generatedTitle = titleMatch?.[1]?.trim() || selectedTopic
    if (generatedTitle.length > 20) {
      logWarn(stepName, `标题超20字（${generatedTitle.length}字），已截取前20字`)
    }

    const content: GeneratedContent = {
      title: generatedTitle.slice(0, 20),
      content: stripMarkdown(contentMatch?.[1]?.trim() || '').slice(0, 800),
      tags: tagsMatch?.[1]?.split(',').map((t: string) => t.trim()).filter(Boolean) || []
    }

    logInfo(stepName, `解析完成: 标题=${content.title.substring(0, 20)}... 正文=${content.content.length}字 标签=${content.tags.length}个`)
    const successLog = createStepLog(stepName, 'success', `文案生成完成（${content.content.length}字，${content.tags.length}个标签，${apiDuration}ms）`, stepStart)

    return {
      rawContent: `标题：${content.title}\n正文：${content.content}\n标签：[${content.tags.join(', ')}]`,
      currentStep: 'content_generation',
      stepLogs: [...logs, successLog]
    }
  } catch (error: any) {
    logStepError(stepName, error.message || '步骤失败', Date.now() - new Date(stepStart).getTime())
    const errorLog = createStepLog(stepName, 'error', error.message || '文案生成失败', stepStart)
    return {
      error: error.message || '文案生成失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog]
    }
  }
}

// 去AI味节点
export async function humanizerNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = 'AI 润色'
  const stepStart = new Date().toISOString()
  logStepStart(stepName)

  try {
    const { rawContent } = state

    if (!rawContent) {
      throw new Error('无原始文案')
    }

    // 提取正文内容进行润色
    const contentMatch = rawContent.match(/正文：([\s\S]+?)(?:标签：|$)/)
    const originalBody = contentMatch?.[1]?.trim() || rawContent
    logInfo(stepName, `原始文案长度: ${originalBody.length}字`)

    logInfo(stepName, '调用 MiniMax API...')
    const apiStart = Date.now()
    const response = await callMiniMax(
      getHumanizerPrompt(),
      `请对以下文案进行去AI化润色：\n\n${originalBody}`
    )
    const apiDuration = Date.now() - apiStart

    const humanized = stripMarkdown(response.text).slice(0, 800)
    logInfo(stepName, `润色完成（${apiDuration}ms），字数: ${humanized.length}`)
    const successLog = createStepLog(stepName, 'success', `润色完成（${originalBody.length}字 → ${humanized.length}字，${apiDuration}ms）`, stepStart)

    return {
      humanizedContent: humanized,
      currentStep: 'humanization',
      stepLogs: [...logs, successLog]
    }
  } catch (error: any) {
    logStepError(stepName, error.message || '步骤失败', Date.now() - new Date(stepStart).getTime())
    const errorLog = createStepLog(stepName, 'error', error.message || '润色失败', stepStart)
    return {
      error: error.message || '润色失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog]
    }
  }
}

// 敏感词检测节点
export async function sensitiveCheckNode(state: ContentWorkflowState): Promise<Partial<ContentWorkflowState>> {
  const logs: StepLog[] = state.stepLogs || []
  const stepName = '敏感词检测'
  const stepStart = new Date().toISOString()
  logStepStart(stepName)

  try {
    const { humanizedContent } = state

    if (!humanizedContent) {
      throw new Error('无待检测文案')
    }

    logInfo(stepName, `检测文本长度: ${humanizedContent.length}字`)
    const checkStart = Date.now()
    const result = await checkSensitiveWords(humanizedContent)
    const checkDuration = Date.now() - checkStart

    if (result.passed) {
      logInfo(stepName, `通过（${checkDuration}ms）`)
    } else {
      logWarn(stepName, `未通过，违规词: ${result.illegalWords?.map(w => w.word).join(', ')}`)
    }

    const status = result.passed ? '通过' : `发现 ${result.illegalWords?.length || 0} 个违规词`
    const successLog = createStepLog(stepName, 'success', `敏感词检测${status}（${checkDuration}ms）`, stepStart)

    return {
      sensitiveResult: {
        passed: result.passed,
        illegalWords: result.illegalWords
      },
      currentStep: result.passed ? 'done' : 'sensitive_check',
      stepLogs: [...logs, successLog]
    }
  } catch (error: any) {
    logStepError(stepName, error.message || '步骤失败', Date.now() - new Date(stepStart).getTime())
    const errorLog = createStepLog(stepName, 'error', error.message || '敏感词检测失败', stepStart)
    return {
      error: error.message || '敏感词检测失败',
      currentStep: 'error',
      stepLogs: [...logs, errorLog]
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
