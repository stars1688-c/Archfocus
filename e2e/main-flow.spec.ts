import { test, expect, Page } from '@playwright/test'

// ─── Test data ────────────────────────────────────────────────────────────

const ADMIN = { username: 'admin', password: 'admin123@bca' }
const TEST_USER = { phone: '13900001111', password: 'TestPass123', name: '测试博主' }
const ACCOUNT = {
  name: '美食探索家',
  xiaohongshuId: '5ff0e6410000000001005f1a',
  position: '美食探店博主，专注北京美食推荐',
  audience: '25-40岁生活在一二线城市的美食爱好者',
  description: '我是一个热爱美食的北京博主，每周探店3-5家餐厅，擅长拍摄美食照片和撰写详细的用餐体验。我注重食物本身的味道和餐厅的氛围，也会分享一些简单的家常菜谱。我的粉丝主要是关注生活品质的年轻人，他们信任我的推荐。',
}

// 测试标题
const TEST_TITLE = '北京2026年新晋米其林餐厅探店合集'

// ─── Helpers ──────────────────────────────────────────────────────────────

/** 以管理员身份登录并将 token 存入 localStorage */
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForSelector('form')

  await page.getByPlaceholder('输入管理员账号').fill(ADMIN.username)
  await page.getByPlaceholder('输入密码').fill(ADMIN.password)
  await page.getByRole('button', { name: '登 录' }).click()

  // 应跳转到用户管理页
  await page.waitForURL('**/admin/users', { timeout: 10_000 })
  await expect(page.locator('h1')).toContainText('用户管理')
}

/** 创建普通测试用户 */
async function createTestUser(page: Page) {
  await page.click('text=新增用户')
  await page.waitForSelector('text=新增用户', { state: 'visible' })

  await page.fill('input[placeholder="输入手机号"]', TEST_USER.phone)
  await page.fill('input[placeholder="输入密码"]', TEST_USER.password)
  await page.fill('input[placeholder="输入姓名（可选）"]', TEST_USER.name)

  await page.click('button:has-text("保存")')
  await page.waitForSelector('text=新增用户', { state: 'hidden', timeout: 5_000 }).catch(() => {})

  // 验证用户出现在列表中
  await expect(page.locator('table')).toContainText(TEST_USER.phone)
}

/** 以普通用户身份登录主应用 */
async function loginAsUser(page: Page) {
  await page.goto('/login')

  // 等待登录页渲染完成
  await page.waitForSelector('text=手机号', { timeout: 10_000 })

  await page.getByPlaceholder('请输入手机号').fill(TEST_USER.phone)
  await page.getByPlaceholder('请输入密码').fill(TEST_USER.password)
  await page.getByRole('button', { name: '登 录' }).click()

  // 应跳转到工作台
  await page.waitForURL('**/', { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible()
}

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('ArchFocus 主流程 E2E', () => {
  test('完整流程：AI 选题 → AI 文案 → 配图 → 存入草稿箱', async ({ page }) => {
    test.setTimeout(600_000)
    let authToken: string | null = null
    let accountId: string | null = null

    // ── 前置：管理员创建用户 ──────────────────────────────────────────────
    await test.step('管理员登录并创建测试用户', async () => {
      await loginAsAdmin(page)
      await createTestUser(page)
    })

    // ── 前置：测试用户登录 + 创建账号 ──────────────────────────────────
    await test.step('测试用户登录并准备测试环境', async () => {
      await loginAsUser(page)

      // 通过 API 创建小红书账号
      authToken = await page.evaluate(() => {
        try {
          const raw = localStorage.getItem('auth-storage')
          if (raw) {
            const parsed = JSON.parse(raw)
            return parsed.state?.token || null
          }
        } catch {}
        return null
      })
      expect(authToken).toBeTruthy()

      const accountRes = await page.evaluate(async ({ t, acct }) => {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify(acct),
        })
        return res.json()
      }, { t: authToken, acct: ACCOUNT })
      expect(accountRes.success).toBe(true)
      accountId = accountRes.data.id

      // 导航到工作台加载账号到 Zustand store
      await page.goto('/')
      await page.waitForSelector('text=美食探索家', { timeout: 10_000 })

      // 通过 Zustand store 直接选中账号
      await page.evaluate((id) => {
        const store = (window as any).__ZUSTAND_ACCOUNT_STORE__
        if (store) store.getState().selectAccount(id)
      }, accountId)
      await page.waitForTimeout(200)

      // 导航到创作页
      await page.locator('a[href="/create"]').first().click()
      await page.waitForURL('**/create', { timeout: 10_000 })
      // 确认账号已选中
      await expect(page.locator('text=美食探索家')).toBeVisible()
      await page.waitForSelector('text=开始创作')
    })

    // ── Step 1: 填入标题 ───────────────────────────────────────────────────
    await test.step('Step 1: 手动填入标题', async () => {
      await page.getByPlaceholder('输入标题...').fill(TEST_TITLE)
      await page.waitForTimeout(500)
      await page.screenshot({ path: '/tmp/e2e-step1-title-filled.png', fullPage: true })
    })

    // ── Step 2: AI 文案生成（真实 API） ──────────────────────────────────
    await test.step('Step 2: AI 生成文案（真实 MiniMax API）', async () => {
      console.log('⏳ 正在调用 AI 生成文案，预计等待 30-60 秒...')
      await page.click('text=直接生成文案')
      await page.waitForSelector('text=AI 生成内容', { timeout: 120_000 })
      console.log('✅ AI 文案生成完成')

      await expect(page.locator('text=原始生成')).toBeVisible()
      await expect(page.locator('text=去AI味润色后')).toBeVisible()

      // 提取生成的内容
      const generatedContent = await page.evaluate(() => {
        const preEls = document.querySelectorAll('pre')
        return Array.from(preEls).map(el => el.textContent || '').join('\n---\n')
      })
      console.log('📝 生成内容预览:', generatedContent.substring(0, 300))

      await page.screenshot({ path: '/tmp/e2e-step2-content-modal.png', fullPage: true })

      await page.click('button:has-text("使用这段内容")')
      await page.waitForTimeout(500)

      // 进入配图步骤（选题0→文案1→配图2）
      await page.click('text=下一步')
      await page.waitForTimeout(300)
      await page.click('text=下一步')
      await page.waitForTimeout(500)
    })

    // ── Step 3: AI 配图生成（真实 API） ──────────────────────────────────
    await test.step('Step 3: AI 配图生成（真实 Apimart API）', async () => {
      console.log('⏳ 正在调用 AI 生成配图，预计等待 1-3 分钟...')
      await page.click('text=✨ 生成配图')
      await page.waitForSelector('text=生成结果', { timeout: 240_000 })
      console.log('✅ 配图生成完成')

      const image = page.locator('img[alt="生成的配图"]')
      await expect(image).toBeVisible()
      await page.screenshot({ path: '/tmp/e2e-step3-image-preview.png', fullPage: true })

      // 进入发布步骤
      await page.click('text=下一步')
      await page.waitForTimeout(500)
    })

    // ── Step 4: 保存草稿并验证 ─────────────────────────────────────────
    await test.step('Step 4: 保存草稿到笔记库并验证', async () => {
      // 通过 UI 保存草稿
      await page.click('button:has-text("保存草稿")')
      await page.waitForTimeout(1000)

      // 导航到笔记库验证
      await page.goto('/drafts')
      await page.waitForSelector('text=笔记库')
      await expect(page.locator(`text=${TEST_TITLE}`).first()).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('text=待发布').first()).toBeVisible()

      await page.screenshot({ path: '/tmp/e2e-step4-drafts-list.png', fullPage: true })
    })
  })
})
