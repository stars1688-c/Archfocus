// src/lib/search.ts
// MiniMax 搜索工具

export interface SearchResult {
  title: string
  link: string
  snippet: string
  date?: string
}

export interface SearchResponse {
  results: SearchResult[]
  success: boolean
  error?: string
}

// 执行搜索
export async function search(query: string): Promise<SearchResponse> {
  try {
    const { execSync } = require('child_process')

    // 使用 mmx CLI 执行搜索
    const command = `/usr/bin/mmx search query --q "${query.replace(/"/g, '\\"')}" --output json --quiet`

    const output = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })

    const data = JSON.parse(output)

    if (data.base_resp?.status_code !== 0) {
      return {
        results: [],
        success: false,
        error: data.base_resp?.status_msg || '搜索失败',
      }
    }

    const results: SearchResult[] = (data.organic || []).map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      date: item.date || '',
    }))

    return {
      results,
      success: true,
    }
  } catch (error: any) {
    console.error('Search error:', error)
    return {
      results: [],
      success: false,
      error: error.message || '搜索执行失败',
    }
  }
}

// 搜索并格式化结果为文本
export async function searchAndFormat(query: string): Promise<string> {
  const response = await search(query)

  if (!response.success || response.results.length === 0) {
    return `搜索"${query}"无结果`
  }

  const lines = [`搜索结果 (${response.results.length}条):`, '']

  response.results.slice(0, 5).forEach((result, index) => {
    lines.push(`${index + 1}. ${result.title}`)
    lines.push(`   ${result.snippet.substring(0, 150)}...`)
    lines.push('')
  })

  return lines.join('\n')
}