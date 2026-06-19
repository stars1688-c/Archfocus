// 测试 AI 选题字数限制 - 调用 10 次验证 90%+ 合规率
import { callMiniMax } from '../src/lib/ai/client'
import { getTopicGenerationPrompt } from '../src/lib/ai/prompts'

const account = {
  id: 'test-account',
  name: 'AI售前实战日记',
  position: 'AI售前工程师｜解决方案专家',
  audience: '想转行或刚入行AI售前的人群，25-35岁，本科以上',
  description: '专注AI售前岗位技能分享，从售前小白到资深专家的成长路径，涵盖AI行业趋势、售前方法论、面试技巧、职场心得'
}

function countChars(str) {
  return [...str].length
}

function parseTopics(text) {
  const topics = []
  const sameLineRegex = /标题：([\s\S]+?)｜推荐理由：([\s\S]+?)(?=标题：|$)/g
  let match
  while ((match = sameLineRegex.exec(text)) !== null) {
    const title = match[1].trim()
    const reason = match[2].trim()
    if (title && reason) {
      topics.push({ title, reason })
    }
  }
  return topics
}

async function testOnce(round) {
  const systemPrompt = getTopicGenerationPrompt(account)
  const userMessage = '请为上述账号人设生成5个小红书选题。'

  console.log(`\n--- 第 ${round} 轮测试 ---`)
  const response = await callMiniMax(systemPrompt, userMessage)
  const topics = parseTopics(response.text)

  console.log(`LLM 返回:\n${response.text.substring(0, 300)}`)
  console.log(`解析到 ${topics.length} 个选题`)

  const fails: string[] = []
  for (const t of topics) {
    const len = countChars(t.title)
    const status = len <= 20 ? '✅' : '❌'
    console.log(`  ${status} "${t.title}" (${len}字)`)
    if (len > 20) {
      fails.push(t.title)
    }
  }

  return {
    total: topics.length,
    pass: topics.length - fails.length,
    fails
  }
}

async function main() {
  const ROUNDS = 10
  let totalTopics = 0
  let totalPass = 0
  let allFails: string[] = []

  for (let i = 1; i <= ROUNDS; i++) {
    const result = await testOnce(i)
    totalTopics += result.total
    totalPass += result.pass
    allFails.push(...result.fails)
    // 间隔 2 秒避免限流
    if (i < ROUNDS) await new Promise(r => setTimeout(r, 2000))
  }

  const rate = ((totalPass / totalTopics) * 100).toFixed(1)
  console.log(`\n${'='.repeat(50)}`)
  console.log(`总计: ${totalTopics} 个标题, 通过: ${totalPass} 个, 合规率: ${rate}%`)
  if (allFails.length > 0) {
    console.log(`\n失败的标题 (${allFails.length} 个):`)
    allFails.forEach(f => console.log(`  ❌ "${f}" (${countChars(f)}字)`))
  }
  console.log(`\n结论: ${parseFloat(rate) >= 90 ? '✅ 达到 90% 合规率要求' : '❌ 未达到 90% 合规率，需要继续优化'}`)
}

main().catch(console.error)
