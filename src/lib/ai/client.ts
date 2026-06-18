// src/lib/ai/client.ts
import { MINIMAX_API_KEY, MINIMAX_API_URL } from './config'

interface LLMResponse {
  text: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

interface ToolCall {
  name: string
  input: Record<string, any>
}

interface LLMOptions {
  model?: string
  maxTokens?: number
  tools?: Array<{
    type: string
    name: string
    description: string
    params: {
      type: string
      properties: Record<string, any>
      required?: string[]
    }
  }>
}

export async function callMiniMax(
  systemPrompt: string,
  userMessage: string,
  options?: LLMOptions,
  retryCount = 3
): Promise<LLMResponse> {
  const model = options?.model || 'MiniMax-Text-01'
  const maxTokens = options?.maxTokens || 4096

  const requestBody: Record<string, any> = {
    model,
    max_tokens: maxTokens,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  }

  if (options?.tools) {
    requestBody.tools = options.tools
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(`${MINIMAX_API_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'anthropic-version': '2023-06-01',
          'x-api-key': MINIMAX_API_KEY,
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        // 对于 500/502/503/504 错误进行重试
        if (response.status >= 500 && attempt < retryCount) {
          const delay = Math.pow(2, attempt) * 1000 // 指数退避: 1s, 2s, 4s
          console.log(`MiniMax API ${response.status}, 等待 ${delay}ms 后重试...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`MiniMax API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'LLM call failed')
      }

      // 处理 tool_use 类型的内容
      let text = ''
      if (data.content && Array.isArray(data.content)) {
        for (const block of data.content) {
          if (block.type === 'text') {
            text += block.text || ''
          } else if (block.type === 'tool_use') {
            // 工具调用，递归获取结果
            const toolName = block.name
            const toolInput = block.input
            if (toolName === 'web_search') {
              const query = toolInput.query
              const searchResult = await performWebSearch(query)
              text += `\n\n[搜索结果: ${searchResult}]`
            }
          }
        }
      } else {
        text = data.content?.[0]?.text?.trim() || ''
      }

      return {
        text: text.trim(),
        usage: data.usage
      }
    } catch (error: any) {
      lastError = error
      // 网络错误或 429 限流错误，进行重试
      if (attempt < retryCount && (error.message.includes('fetch failed') || error.message.includes('429') || error.message.includes('rate'))) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`MiniMax 请求失败，等待 ${delay}ms 后重试: ${error.message}`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      // 已经是最后一次尝试或非重试错误，直接抛出
      if (attempt >= retryCount) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('MiniMax API 调用失败')
}

// 执行联网搜索
async function performWebSearch(query: string): Promise<string> {
  // 使用 mmx CLI 执行 MiniMax 搜索
  try {
    const { execSync } = require('child_process')
    const command = `mmx search query --q "${query.replace(/"/g, '\\"')}" --output json --quiet`

    const output = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })

    const data = JSON.parse(output)

    if (data.base_resp?.status_code !== 0) {
      return `关于"${query}"的搜索未能获取到实时结果`
    }

    const results = (data.organic || []).slice(0, 5)
    if (results.length === 0) {
      return `关于"${query}"的搜索暂无结果`
    }

    return results.map((r: any, i: number) =>
      `[${i + 1}] ${r.title}\n    ${(r.snippet || '').substring(0, 150)}`
    ).join('\n\n')
  } catch (error: any) {
    console.error('Web search error:', error)
    return `关于"${query}"的搜索执行失败`
  }
}
