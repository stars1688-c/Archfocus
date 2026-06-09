// src/lib/ai.ts
import type { Account } from '@/types'

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
const MINIMAX_API_URL = process.env.MINIMAX_API_URL || 'https://api.minimaxi.com/anthropic'

interface AIGenerateRequest {
  account: Account
  topic?: string
  type: 'title' | 'content' | 'image_prompt'
  context?: string
}

interface AIGenerateResponse {
  success: boolean
  data?: {
    text: string
    usage?: {
      input_tokens: number
      output_tokens: number
    }
  }
  error?: string
}

// 零克敏感词检测结果
interface SensitiveWordResult {
  passed: boolean
  illegalWords?: { word: string; type: string }[]
  error?: string
}

export async function generateWithAI({ account, topic, type, context }: AIGenerateRequest): Promise<AIGenerateResponse> {
  if (!MINIMAX_API_KEY) {
    return { success: false, error: 'AI API 未配置' }
  }

  const systemPrompt = getSystemPrompt(account, type)
  const userMessage = getUserMessage(type, topic, context)

  // 构建请求体
  const requestBody: any = {
    model: 'MiniMax-Text-01',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ]
  }

  // 选题生成时启用联网搜索
  if (type === 'title') {
    requestBody.tools = [
      {
        type: 'web_search',
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
    ]
  }

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
      const errorData = await response.json().catch(() => ({}))
      console.error('MiniMax API error:', response.status, errorData)
      return { success: false, error: `API 请求失败: ${response.status}` }
    }

    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message || 'AI 生成失败' }
    }

    const text = data.content?.[0]?.text || ''

    return {
      success: true,
      data: {
        text: text.trim(),
        usage: data.usage
      }
    }
  } catch (error) {
    console.error('AI generation error:', error)
    return { success: false, error: '网络请求失败' }
  }
}

// 文案生成 - 包含 copywriting 技能框架
function getContentSystemPrompt(account: Account, topic?: string): string {
  return `你是小红书内容创作大师，擅长创作符合特定人设的优质小红书笔记。

账号人设：
- 账号名：${account.name}
- 定位：${account.position}
- 目标受众：${account.audience}
- 人设描述：${account.description}

## 文案写作框架

创作时请使用以下经典框架之一：

### AIDA 框架（注意力-兴趣-欲望-行动）
适用于种草、好物推荐类内容：
- ATTENTION：醒目标题，引发好奇
- INTEREST：详细展开，引发共鸣
- DESIRE：展示效果，激发欲望
- ACTION：明确引导，呼吁行动

### PAS 框架（问题- agitation-解决方案）
适用于痛点驱动型内容：
- PROBLEM：指出问题
- AGITATION：加剧痛点
- SOLUTION：给出方案

### FAB 框架（功能-优势-利益）
适用于产品对比、测评类内容：
- FEATURE：说明功能
- ADVANTAGE：解释优势
- BENEFIT：阐述利益

## 小红书文案要求

1. 语言风格：亲切、自然、有感染力，像真实分享
2. 内容：真实分享，避免硬广感
3. 标题：新颖有趣，能引发好奇或共鸣，适当使用 emoji
4. 正文：适当分段，每段不要太长，使用 emoji 增加可读性
5. 标签：生成 3-5 个相关标签
6. 结尾：引导互动（评论、收藏、关注）
7. 避免：模板化表达、套路化结尾、AI 写作痕迹

## 输出格式
标题：[标题]
正文：[正文]
标签：[标签1, 标签2, 标签3]`
}

function getContentUserMessage(topic: string): string {
  return `帮我写一篇小红书笔记，主题：${topic}

请结合账号人设，使用合适的文案框架，创作一篇吸引人的笔记。
确保内容真实自然，避免 AI 写作痕迹。`
}

// 去AI味 prompt
function getHumanizerPrompt(): string {
  return `你是文字润色编辑，专注于去除 AI 生成文本的痕迹。

## 24 种 AI 写作模式（需消除）

| 类别 | 模式 | AI 典型表达 |
|------|------|------------|
| 内容 | 夸大其词 | "标志着一个转折点..." |
| 内容 | 无实质的-ing分析 | "...展示着...反映着...彰显着..." |
| 内容 | 推销语言 | "精致"、"惊艳"、"卓越" |
| 内容 | 模糊归因 | "专家认为"、"研究表明" |
| 语言 | AI 词汇 | "delve"、"tapestry"、"crucial"、"seamless"、"leverage" |
| 语言 | 动词替代 | "serves as"、"boasts"、"features" 代替 "is"、"has" |
| 语言 | 否定平行 | "不仅 X，还 Y" |
| 语言 | 三连词 | "创新、灵感、洞察" |
| 沟通 | 机器人话术 | "希望这有帮助！"、"如果您有任何问题..." |
| 沟通 | 讨好语气 | "太棒了！"、"您说得对！" |
| 填充 | 冗余短语 | "为了"、"由于事实上"、"在此时" |

## 统计信号检测

- 突发性：人类写作高低起伏，AI 写作均匀平稳
- 词汇多样性：人类 0.5-0.7，AI 0.3-0.5
- 句子长度变化：人类变化大，AI 几乎相同

## 润色原则

1. 用 "is"、"has" 替代 "serves as"、"boasts"
2. 删除填充词："In order to" → "to"，"Due to the fact that" → "because"
3. 删除机器人话术："I hope this helps!"、"Great question!" 等
4. 避免三连词堆砌
5. 添加真实个性：有观点、有情感、承认复杂
6. 句子长度要有变化
7. 结尾要具体，不要泛泛而谈

## 润色示例

**润色前（AI 感）：**
> 希望这对您有帮助！以下是可持续能源的概述。可持续能源是人类对环境承诺的持久证明，标志着一个转折点。在当今快速发展的格局中，这些突破性技术正在重塑国家能源生产方式...

**润色后（真人感）：**
> 太阳能板成本在 2010-2023 年间下降了 90%。这一数据解释了为什么应用开始普及——它不再只是意识形态选择，而是经济选择。德国现在 46% 的电力来自可再生能源。转型正在进行，但过程混乱且不均衡。`
}

// 内容生成 - 使用 copywriting 技能
export async function generateContent(account: Account, topic: string): Promise<AIGenerateResponse> {
  if (!MINIMAX_API_KEY) {
    return { success: false, error: 'AI API 未配置' }
  }

  try {
    const response = await fetch(`${MINIMAX_API_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'anthropic-version': '2023-06-01',
        'x-api-key': MINIMAX_API_KEY,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        max_tokens: 4096,
        system: getContentSystemPrompt(account, topic),
        messages: [
          { role: 'user', content: getContentUserMessage(topic) }
        ]
      })
    })

    if (!response.ok) {
      return { success: false, error: `API 请求失败: ${response.status}` }
    }

    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message || '文案生成失败' }
    }

    const text = data.content?.[0]?.text || ''
    return {
      success: true,
      data: { text: text.trim(), usage: data.usage }
    }
  } catch (error) {
    console.error('Content generation error:', error)
    return { success: false, error: '网络请求失败' }
  }
}

// 去AI味润色
export async function humanizeContent(content: string): Promise<AIGenerateResponse> {
  if (!MINIMAX_API_KEY) {
    return { success: false, error: 'AI API 未配置' }
  }

  try {
    const response = await fetch(`${MINIMAX_API_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'anthropic-version': '2023-06-01',
        'x-api-key': MINIMAX_API_KEY,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        max_tokens: 4096,
        system: getHumanizerPrompt(),
        messages: [
          { role: 'user', content: `请对以下文案进行去 AI 化润色，使其更自然、像真人原创：\n\n${content}` }
        ]
      })
    })

    if (!response.ok) {
      return { success: false, error: `API 请求失败: ${response.status}` }
    }

    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message || '润色失败' }
    }

    const text = data.content?.[0]?.text || ''
    return {
      success: true,
      data: { text: text.trim(), usage: data.usage }
    }
  } catch (error) {
    console.error('Humanizer error:', error)
    return { success: false, error: '网络请求失败' }
  }
}

// 零克敏感词检测
export async function checkSensitiveWords(text: string): Promise<SensitiveWordResult> {
  try {
    const response = await fetch('https://ci.lingke.pro/api/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `text=${encodeURIComponent(text)}`
    })

    if (!response.ok) {
      return { passed: false, error: `检测失败: ${response.status}` }
    }

    const data = await response.json()
    return {
      passed: data.result === true || data.result === 'true',
      illegalWords: data.illegal_words || []
    }
  } catch (error) {
    console.error('Sensitive word check error:', error)
    return { passed: false, error: '网络请求失败' }
  }
}

// 完整文案生成流程：生成 -> 去AI味 -> 敏感词检测
export async function generateCompleteContent(
  account: Account,
  topic: string
): Promise<{
  success: boolean
  data?: {
    originalContent: string
    humanizedContent: string
    sensitiveCheck: SensitiveWordResult
  }
  error?: string
}> {
  // 1. 生成文案
  const contentResult = await generateContent(account, topic)
  if (!contentResult.success || !contentResult.data) {
    return { success: false, error: contentResult.error || '文案生成失败' }
  }

  const originalContent = contentResult.data.text

  // 2. 去AI味
  const humanizerResult = await humanizeContent(originalContent)
  if (!humanizerResult.success || !humanizerResult.data) {
    return { success: false, error: humanizerResult.error || '润色失败' }
  }

  const humanizedContent = humanizerResult.data.text

  // 3. 敏感词检测
  const sensitiveResult = await checkSensitiveWords(humanizedContent)

  return {
    success: true,
    data: {
      originalContent,
      humanizedContent,
      sensitiveCheck: sensitiveResult
    }
  }
}

function getSystemPrompt(account: Account, type: 'title' | 'content' | 'image_prompt'): string {
  const basePrompt = `你是小红书内容创作助手，擅长创作符合特定人设的优质笔记。`

  const personaContext = `账号人设：
- 账号名：${account.name}
- 定位：${account.position}
- 目标受众：${account.audience}
- 人设描述：${account.description}`

  switch (type) {
    case 'title':
      return `${basePrompt}

${personaContext}

请根据人设和主题，结合当前网络热点和趋势，生成3个吸引人的小红书标题。
要求：
1. 先联网搜索相关热点话题和趋势
2. 结合人设定位和热点，生成吸引目标受众的标题
3. 标题新颖有趣，能引发好奇或共鸣
4. 适当使用emoji增加吸引力
5. 控制在20字以内
6. 每个标题占一行，用数字序号1. 2. 3.`

    case 'content':
      return `${basePrompt}

${personaContext}

请根据以下主题，创作一篇符合人设的小红书笔记正文。
要求：
1. 语言风格：亲切、自然、有感染力
2. 内容：真实分享，避免硬广
3. 适当分段，使用emoji增加可读性
4. 结尾引导互动（如评论、收藏）
5. 控制在500-800字`

    case 'image_prompt':
      return `${basePrompt}

${personaContext}

请根据笔记主题，生成一个AI绘图提示词（英文），用于生成小红书封面图。
要求：
1. 英文描述，简洁明确
2. 包含主体、风格、光线、背景等要素
3. 适合电商/种草类图片风格
4. 长度控制在100词以内`
  }
}

function getUserMessage(type: 'title' | 'content' | 'image_prompt', topic?: string, context?: string): string {
  switch (type) {
    case 'title':
      return `帮我生成3个小红书标题，主题：${topic || context || '请根据人设自行发挥'}`
    case 'content':
      return `帮我写一篇小红书笔记，主题：${topic || context || '请根据人设自行发挥'}`
    case 'image_prompt':
      return `为这篇笔记生成一个AI绘图提示词：${topic || context || '请根据人设自行发挥'}`
  }
}

// 批量生成内容
export async function batchGenerateContent(
  account: Account,
  topics: string[]
): Promise<{ title?: string; content?: string; topic: string }[]> {
  const results = await Promise.all(
    topics.map(async (topic) => {
      const [titleRes, contentRes] = await Promise.all([
        generateWithAI({ account, topic, type: 'title' }),
        generateContent(account, topic)
      ])

      return {
        topic,
        title: titleRes.success ? titleRes.data?.text.split('\n').filter(Boolean)[0] : undefined,
        content: contentRes.success ? contentRes.data?.text : undefined
      }
    })
  )

  return results
}
