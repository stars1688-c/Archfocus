// 测试文案生成字数限制 - 调用 5 次验证 90%+ 合规率
import { callMiniMax } from '../src/lib/ai/client'
import { getContentGenerationPrompt } from '../src/lib/ai/prompts'

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

function stripMarkdown(text) {
  if (!text) return text
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<=\s)_([^_]+)_(?=\s)/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+[.、]\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractContent(text) {
  const contentMatch = text.match(/正文：([\s\S]+?)(?:标签：|$)/)
  return stripMarkdown(contentMatch?.[1]?.trim() || '')
}

async function testOnce(round) {
  const systemPrompt = getContentGenerationPrompt(account)
  const userMessage = '请根据以下主题创作小红书笔记：零基础转行AI售前，我用这3个方法快速入门'

  console.log(`\n--- 第 ${round} 轮测试 ---`)
  const response = await callMiniMax(systemPrompt, userMessage)
  const content = extractContent(response.text)
  const len = countChars(content)

  // 显示内容前100字
  console.log(`正文预览: ${content.substring(0, 100)}...`)
  console.log(`正文长度: ${len}字 ${len <= 800 ? '✅' : '❌'}`)

  return {
    total: 1,
    pass: len <= 800 ? 1 : 0,
    fails: len > 800 ? [{ content, len }] : []
  }
}

async function main() {
  const ROUNDS = 5
  let totalPass = 0
  let allFails = []

  for (let i = 1; i <= ROUNDS; i++) {
    const result = await testOnce(i)
    totalPass += result.pass
    allFails.push(...result.fails)
    if (i < ROUNDS) await new Promise(r => setTimeout(r, 2000))
  }

  const rate = ((totalPass / ROUNDS) * 100).toFixed(1)
  console.log(`\n${'='.repeat(50)}`)
  console.log(`测试 ${ROUNDS} 轮, 通过: ${totalPass} 轮, 合规率: ${rate}%`)
  if (allFails.length > 0) {
    console.log(`\n失败的轮次:`)
    allFails.forEach((f, i) => console.log(`  ❌ 第${i+1}次: ${f.len}字`))
  }
  console.log(`\n结论: ${parseFloat(rate) >= 90 ? '✅ 达到 90% 合规率要求' : '❌ 未达到 90% 合规率，需要继续优化'}`)
}

main().catch(console.error)
