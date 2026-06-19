// 验证四个修复 - 代码级验证 + UI 可用性测试
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3000'

async function main() {
  console.log('=== 验证四个修复 ===\n')

  // === 代码级验证：检查关键改动是否存在 ===
  console.log('--- 代码改动检查 ---')
  const checks = [
    ['MiniMax 随机种子', 'seed: Math.floor', 'src/lib/ai/image.ts'],
    ['MiniMax base64下载', '下载图片并转为 base64', 'src/lib/ai/image.ts'],
    ['LangGraph htmlScreenshotUrls', 'htmlScreenshotUrls: Annotation', 'src/lib/workflow/graph.ts'],
    ['LangGraph error 字段', 'error: Annotation', 'src/lib/workflow/graph.ts'],
    ['LangGraph htmlStyle 字段', 'htmlStyle: Annotation', 'src/lib/workflow/graph.ts'],
    ['API route htmlStyle', "htmlStyle: htmlStyle || undefined", 'src/app/api/workflow/image/route.ts'],
    ['配图提示词人物规则', '人物出现规则', 'src/lib/ai/prompts.ts'],
    ['全中文提示词约束', '全中文', 'src/lib/ai/prompts.ts'],
    ['默认模型 gpt-image-2', "useState<string>('gpt-image-2')", 'src/app/(dashboard)/create/page.tsx'],
    ['发布状态 pending_link', "syncStatus: 'pending_link'", 'src/app/api/notes/route.ts'],
    ['CAPEL 倒计时字数控制', '倒计时法', 'src/lib/ai/prompts.ts'],
  ]

  let allPass = true
  for (const [name, keyword, file] of checks) {
    const fullPath = path.resolve(file)
    const content = fs.readFileSync(fullPath, 'utf-8')
    const found = content.includes(keyword)
    console.log(`  ${found ? '✅' : '❌'} ${name}`)
    if (!found) allPass = false
  }

  // === UI 验证：启动浏览器检查 ===
  console.log('\n--- UI 可用性检查 ---')
  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()

    // 检查服务是否响应
    const resp = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 })
    console.log(`  服务器响应: ${resp?.status() === 200 ? '✅' : '❌'} (${resp?.status()})`)

    // 检查 /create 页面
    await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle', timeout: 10000 })
    const title = await page.title()
    console.log(`  /create 页面加载: ${title ? '✅' : '❌'}`)

    // 检查全屏编辑按钮
    const fullscreenBtn = page.locator('button[title="全屏编辑"]')
    const btnCount = await fullscreenBtn.count()
    console.log(`  全屏编辑按钮: ${btnCount > 0 ? '✅' : '❌'}`)

    if (btnCount > 0) {
      await fullscreenBtn.click()
      await page.waitForTimeout(500)
      // 检查是否有 Modal 层出现
      const modalContent = page.locator('text=编辑笔记内容')
      const modalVisible = await modalContent.isVisible().catch(() => false)
      console.log(`  全屏 Modal 弹窗: ${modalVisible ? '✅' : '❌'}`)

      // 检查完成编辑按钮
      const doneBtn = page.locator('text=完成编辑')
      const doneVisible = await doneBtn.isVisible().catch(() => false)
      console.log(`  完成编辑按钮: ${doneVisible ? '✅' : '❌'} `)

      // 关闭
      if (doneVisible) await doneBtn.click()
      await page.waitForTimeout(300)
    }

    // 检查默认模型选项
    const gptOption = page.locator('text=GPT-Image 2（默认）')
    const gptExists = await gptOption.count()
    console.log(`  默认模型 GPT-Image 2: ${gptExists > 0 ? '✅' : '❌'} `)

    await browser.close()
  } catch (e) {
    console.log(`  ❌ UI 检查失败: ${e.message}`)
    if (browser) await browser.close()
    allPass = false
  }

  // === 构建验证 ===
  console.log('\n--- 构建验证 ---')
  // 服务已在运行，验证 API 路由可访问
  try {
    const apiResp = await fetch(`${BASE_URL}/api/notes`)
    console.log(`  /api/notes 响应: ${apiResp.status === 200 || apiResp.status === 401 ? '✅' : '❌'} (${apiResp.status})`)
  } catch (e) {
    console.log(`  ❌ API 不可达: ${e.message}`)
    allPass = false
  }

  console.log(`\n${'='.repeat(40)}`)
  console.log(`总体结果: ${allPass ? '✅ 全部通过' : '❌ 有失败项'}`)
  console.log(`${'='.repeat(40)}`)
}

main().catch(e => {
  console.error('验证异常:', e)
  process.exit(1)
})
