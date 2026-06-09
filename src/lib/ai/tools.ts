// src/lib/ai/tools.ts
import { LINGKE_API_URL } from './config'

// 联网搜索 Tool 定义
export const webSearchTool = {
  name: 'web_search',
  description: '搜索互联网获取最新信息，用于热点选题分析',
  params: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词'
      }
    },
    required: ['query']
  }
}

// 零克敏感词检测 Tool 定义
export const sensitiveWordCheckTool = {
  name: 'sensitive_word_check',
  description: '检测文案中的敏感词、违禁词、广告词',
  params: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '待检测的文案内容'
      }
    },
    required: ['text']
  }
}

// 执行敏感词检测
export async function checkSensitiveWords(text: string): Promise<{
  passed: boolean
  illegalWords?: { word: string; type: string }[]
}> {
  try {
    const response = await fetch(LINGKE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `text=${encodeURIComponent(text)}`
    })

    if (!response.ok) {
      throw new Error(`Sensitive word check failed: ${response.status}`)
    }

    const data = await response.json()
    return {
      passed: data.result === true || data.result === 'true',
      illegalWords: data.illegal_words || []
    }
  } catch (error) {
    console.error('Sensitive word check error:', error)
    return { passed: false, illegalWords: [] }
  }
}

// 执行联网搜索
export async function performWebSearch(query: string): Promise<string> {
  try {
    // 这里可以接入其他搜索 API
    // 目前返回模拟结果
    return `[搜索结果] 关于"${query}"的最新信息...`
  } catch (error) {
    console.error('Web search error:', error)
    return `搜索"${query}"失败`
  }
}
