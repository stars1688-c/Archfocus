// src/lib/workflow/webSearch.ts
import { execSync } from 'child_process'

export async function performWebSearch(query: string): Promise<string> {
  try {
    const command = `mmx search query --q "${query.replace(/"/g, '\\"')}" --output json --quiet`
    const output = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })
    const data = JSON.parse(output)
    const results = (data.organic || []).slice(0, 3)
    return results.map((r: any) => `[${r.title}] ${(r.snippet || '').substring(0, 200)}`).join('\n\n')
  } catch {
    throw new Error('Web search failed')
  }
}
