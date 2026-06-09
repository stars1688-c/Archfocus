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
  options?: LLMOptions
): Promise<LLMResponse> {
  const model = options?.model || 'MiniMax-Text-01'
  const maxTokens = options?.maxTokens || 4096

  const requestBody: Record<string, any> = {
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  }

  if (options?.tools) {
    requestBody.tools = options.tools
  }

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
}

// 执行联网搜索
async function performWebSearch(query: string): Promise<string> {
  // 使用 MiniMax 内置的搜索能力
  // 这里简化为返回搜索提示
  try {
    const response = await fetch(`${MINIMAX_API_URL}/v1/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'x-api-key': MINIMAX_API_KEY,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        query,
        num_results: 5
      })
    })

    if (!response.ok) {
      return `关于"${query}"的搜索未能获取到实时结果`
    }

    const data = await response.json()
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((r: any) => `${r.title}: ${r.snippet}`).join('\n')
    }
    return `关于"${query}"的搜索结果`
  } catch {
    return `关于"${query}"的搜索未能获取到实时结果`
  }
}
