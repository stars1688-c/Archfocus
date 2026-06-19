import { test, expect, Page } from '@playwright/test'

// ─── Test data ────────────────────────────────────────────────────────────

const ADMIN = { username: 'admin', password: 'admin123@bca' }
const TEST_USER = { phone: '13900002222', password: 'TestPass456', name: '测试用户' }
const ACCOUNT_A = {
  name: '美食探索家',
  xiaohongshuId: 'acc-a-001',
  position: '美食探店博主',
  audience: '25-40岁美食爱好者',
  description: '美食探店博主，专注北京美食推荐。',
}
const ACCOUNT_B = {
  name: '科技评测家',
  xiaohongshuId: 'acc-b-001',
  position: '数码科技博主',
  audience: '18-35岁科技爱好者',
  description: '数码产品深度评测博主。',
}

const TITLE_A = '北京2026年新晋米其林餐厅探店合集'
const TITLE_B = 'iPhone 18 Pro评测：性能飞跃'

// ─── Helpers ──────────────────────────────────────────────────────────────

/** 管理员登录并创建测试用户 */
async function ensureTestUser(page: Page) {
  await page.goto('/admin/login')
  await page.waitForSelector('form')
  await page.getByPlaceholder('输入管理员账号').fill(ADMIN.username)
  await page.getByPlaceholder('输入密码').fill(ADMIN.password)
  await page.getByRole('button', { name: '登 录' }).click()
  await page.waitForURL('**/admin/users', { timeout: 10_000 })

  const userExists = await page.locator('table').getByText(TEST_USER.phone).isVisible().catch(() => false)
  if (userExists) {
    console.log(`用户 ${TEST_USER.phone} 已存在，跳过创建`)
    return
  }

  await page.click('text=新增用户')
  await page.waitForSelector('text=新增用户', { state: 'visible' })
  await page.fill('input[placeholder="输入手机号"]', TEST_USER.phone)
  await page.fill('input[placeholder="输入密码"]', TEST_USER.password)
  await page.fill('input[placeholder="输入姓名（可选）"]', TEST_USER.name)
  await page.click('button:has-text("保存")')
  await page.waitForTimeout(1000)
  console.log(`用户 ${TEST_USER.phone} 创建成功`)
}

/** 用户登录并返回 authToken */
async function loginAsUser(page: Page): Promise<string> {
  await page.goto('/login')
  await page.waitForSelector('text=手机号', { timeout: 10_000 })
  await page.getByPlaceholder('请输入手机号').fill(TEST_USER.phone)
  await page.getByPlaceholder('请输入密码').fill(TEST_USER.password)
  await page.getByRole('button', { name: '登 录' }).click()
  await page.waitForURL('**/', { timeout: 10_000 })

  const authToken = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('auth-storage')
      if (raw) return JSON.parse(raw).state?.token || null
    } catch {}
    return null
  })
  expect(authToken).toBeTruthy()
  return authToken!
}

/** 通过 API 创建小红书账号 */
async function createAccount(page: Page, token: string, acct: typeof ACCOUNT_A): Promise<string> {
  const result = await page.evaluate(async ({ t, a }) => {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(a),
    })
    return (await res.json()).data?.id as string
  }, { t: token, a: acct })
  expect(result).toBeTruthy()
  console.log(`账号 "${acct.name}" 创建成功`)
  return result
}

/** 切换到指定账号（通过 Zustand store） */
async function switchAccount(page: Page, accountId: string) {
  await page.evaluate((id) => {
    const store = (window as any).__ZUSTAND_ACCOUNT_STORE__
    if (store) store.getState().selectAccount(id)
  }, accountId)
  await page.waitForTimeout(1500)
}

/** 导航到创作页（通过点击链接触发客户端导航，保留 Zustand store） */
async function navigateToCreate(page: Page) {
  await page.locator('a[href="/create"]').first().click()
  await page.waitForURL('**/create', { timeout: 10_000 })
  // 等待页面渲染：标题输入框可见
  const input = page.getByPlaceholder('输入标题，或点击上方 AI 选题...')
  await input.waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForTimeout(500)
}

/** 获取标题输入框的值 */
async function getTitle(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="输入标题"]') as HTMLInputElement
    return input?.value || ''
  })
}

/** 等待自动保存（防抖 2s + 延迟） */
async function waitForAutoSave(page: Page) {
  await page.waitForTimeout(4000)
}

// ─── Tests ────────────────────────────────────────────────────────────────

test.describe('账号切换草稿自动保存', () => {
  test('切换账号时自动恢复不同账号的草稿内容', async ({ page }) => {
    test.setTimeout(180_000)
    let authToken: string
    let accountIdA: string
    let accountIdB: string

    // 1. 前置准备
    await test.step('前置准备', async () => {
      await ensureTestUser(page)
      authToken = await loginAsUser(page)

      await page.goto('/')
      await page.waitForTimeout(500)

      accountIdA = await createAccount(page, authToken, ACCOUNT_A)
      accountIdB = await createAccount(page, authToken, ACCOUNT_B)

      // 刷新让 Zustand store 加载账号列表
      await page.goto('/')
      await page.waitForTimeout(1000)
    })

    // 2. 账号 A 输入标题 → 自动保存
    await test.step('账号A输入标题并等待保存', async () => {
      await switchAccount(page, accountIdA)
      await navigateToCreate(page)

      await page.getByPlaceholder('输入标题，或点击上方 AI 选题...').fill(TITLE_A)
      await waitForAutoSave(page)
    })

    // 3. 切换到账号 B → 应为空白
    await test.step('切换到账号B，验证标题为空', async () => {
      // 通过点击导航栏的"工作台"回首页，再切换账号
      await page.locator('a[href="/"]').first().click()
      await page.waitForURL('**/', { timeout: 10_000 })
      await page.waitForTimeout(500)

      // 切换到账号 B
      await switchAccount(page, accountIdB)

      // 进入创作页
      await navigateToCreate(page)

      // 验证账号 B 标题为空
      const titleB = await getTitle(page)
      expect(titleB).toBe('')
    })

    // 4. 账号 B 输入标题 → 切回 A → 验证 A 的草稿恢复
    await test.step('账号B输入标题，切回A应恢复A的内容', async () => {
      await page.getByPlaceholder('输入标题，或点击上方 AI 选题...').fill(TITLE_B)
      await waitForAutoSave(page)

      // 回首页切换
      await page.locator('a[href="/"]').first().click()
      await page.waitForURL('**/', { timeout: 10_000 })
      await page.waitForTimeout(500)

      await switchAccount(page, accountIdA)
      await navigateToCreate(page)

      const titleRestored = await getTitle(page)
      expect(titleRestored).toBe(TITLE_A)
    })

    // 5. 再切回 B 验证独立性
    await test.step('切回B验证B独立持久化', async () => {
      await page.locator('a[href="/"]').first().click()
      await page.waitForURL('**/', { timeout: 10_000 })
      await page.waitForTimeout(500)

      await switchAccount(page, accountIdB)
      await navigateToCreate(page)

      const titleRestored = await getTitle(page)
      expect(titleRestored).toBe(TITLE_B)
    })
  })

  test('快速切换账号（防抖期内）不应丢失已保存的草稿', async ({ page }) => {
    test.setTimeout(180_000)
    let authToken: string
    let accountIdA: string
    let accountIdB: string

    await test.step('前置准备', async () => {
      await ensureTestUser(page)
      authToken = await loginAsUser(page)
      await page.goto('/')
      await page.waitForTimeout(500)
      accountIdA = await createAccount(page, authToken, ACCOUNT_A)
      accountIdB = await createAccount(page, authToken, ACCOUNT_B)
      await page.goto('/')
      await page.waitForTimeout(1000)
    })

    // 建立账号 A 的草稿
    await test.step('为账号A建立初始草稿', async () => {
      await switchAccount(page, accountIdA)
      await navigateToCreate(page)

      await page.getByPlaceholder('输入标题，或点击上方 AI 选题...').fill(TITLE_A)
      await waitForAutoSave(page)
    })

    // 快速切换场景
    await test.step('修改A后快速切B再切回A，数据不应丢失', async () => {
      // 回首页
      await page.locator('a[href="/"]').first().click()
      await page.waitForURL('**/', { timeout: 10_000 })
      await page.waitForTimeout(500)

      // 切回调到 A
      await switchAccount(page, accountIdA)
      await navigateToCreate(page)

      // 确认标题已恢复
      expect(await getTitle(page)).toBe(TITLE_A)

      // 修改标题
      const UPDATED_TITLE = '2026北京米其林新晋餐厅推荐'
      await page.getByPlaceholder('输入标题，或点击上方 AI 选题...').fill(UPDATED_TITLE)

      // 不等待保存，立即回首页并切账号 B（防抖期内触发）
      await page.locator('a[href="/"]').first().click()
      await page.waitForURL('**/', { timeout: 10_000 })
      await page.waitForTimeout(500)

      await switchAccount(page, accountIdB)
      await page.waitForTimeout(500)

      // 再切回 A
      await switchAccount(page, accountIdA)
      await navigateToCreate(page)

      // 数据不应丢失（应该是新标题或旧标题，但不是空）
      const finalTitle = await getTitle(page)
      console.log(`快速切换后账号A标题: "${finalTitle}"`)
      expect(finalTitle).not.toBe('')
    })
  })
})
