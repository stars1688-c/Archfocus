// src/lib/ai/tools.ts

// 联网搜索 Tool 定义
export const webSearchTool = {
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

// 零克敏感词检测 Tool 定义
export const sensitiveWordCheckTool = {
  name: 'sensitive_word_check',
  description: '检测文案中的敏感词、违禁词、广告词',
  params: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '待检测的文案内容'
      }
    },
    required: ['text']
  }
}

// 敏感词模式匹配项
interface SensitivePattern {
  pattern: RegExp
  word: string
  type: string
}

// 构建敏感词模式列表（精确匹配 + 正则变体匹配）
const sensitivePatterns: SensitivePattern[] = [
  // ========== 竞品平台 ==========
  { pattern: /公众号/g, word: '公众号', type: '竞品平台' },
  { pattern: /抖音/g, word: '抖音', type: '竞品平台' },
  { pattern: /微博/g, word: '微博', type: '竞品平台' },
  { pattern: /淘宝/g, word: '淘宝', type: '竞品平台' },
  { pattern: /天猫/g, word: '天猫', type: '竞品平台' },
  { pattern: /京东/g, word: '京东', type: '竞品平台' },
  { pattern: /拼多多/g, word: '拼多多', type: '竞品平台' },
  { pattern: /闲鱼/g, word: '闲鱼', type: '竞品平台' },
  { pattern: /亚马逊/g, word: '亚马逊', type: '竞品平台' },
  { pattern: /哔哩哔哩|b站/gi, word: 'B站', type: '竞品平台' },
  { pattern: /快手/g, word: '快手', type: '竞品平台' },
  { pattern: /视频号/g, word: '视频号', type: '竞品平台' },
  { pattern: /知乎/g, word: '知乎', type: '竞品平台' },
  { pattern: /豆瓣/g, word: '豆瓣', type: '竞品平台' },

  // ========== 联系方式与导流 ==========
  { pattern: /微信号/g, word: '微信号', type: '联系方式' },
  { pattern: /二维码/g, word: '二维码', type: '联系方式' },
  { pattern: /手机号/g, word: '手机号', type: '联系方式' },
  { pattern: /电话号码/g, word: '电话号码', type: '联系方式' },
  { pattern: /添加好友/g, word: '添加好友', type: '联系方式' },
  { pattern: /加微信/g, word: '加微信', type: '联系方式' },
  { pattern: /加\s*微\s*信/g, word: '加微信', type: '联系方式' },
  { pattern: /加V/g, word: '加V', type: '联系方式' },
  { pattern: /加\s*[vV]/g, word: '加V', type: '联系方式' },
  { pattern: /点击链接/g, word: '点击链接', type: '联系方式' },
  { pattern: /看主页/g, word: '看主页', type: '联系方式' },
  { pattern: /完整版在/g, word: '完整版在', type: '联系方式' },
  // 谐音变体
  { pattern: /薇信/g, word: '微信', type: '联系方式' },
  { pattern: /危信/g, word: '微信', type: '联系方式' },
  { pattern: /VX|vx/g, word: 'VX', type: '联系方式' },
  { pattern: /wei?xin/g, word: 'weixin', type: '联系方式' },
  // 手机号（11位数字）
  { pattern: /1[3-9]\d{9}/g, word: '手机号', type: '联系方式' },
  // 邮箱
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, word: '邮箱', type: '联系方式' },

  // ========== 诱导互动 ==========
  { pattern: /私信/g, word: '私信', type: '诱导互动' },
  { pattern: /私聊/g, word: '私聊', type: '诱导互动' },
  { pattern: /私信领福利/g, word: '私信领福利', type: '诱导互动' },
  { pattern: /戳我/g, word: '戳我', type: '诱导互动' },
  { pattern: /点我/g, word: '点我', type: '诱导互动' },

  // ========== 虚假宣传 ==========
  { pattern: /根治/g, word: '根治', type: '虚假宣传' },
  { pattern: /无效退款/g, word: '无效退款', type: '虚假宣传' },
  { pattern: /百分百/g, word: '百分百', type: '虚假宣传' },
  { pattern: /100%/g, word: '100%', type: '虚假宣传' },
  { pattern: /永不反弹/g, word: '永不反弹', type: '虚假宣传' },
  { pattern: /假一赔十/g, word: '假一赔十', type: '虚假宣传' },
  { pattern: /药到病除/g, word: '药到病除', type: '虚假宣传' },

  // ========== 广告法极限词 ==========
  { pattern: /国家级/g, word: '国家级', type: '极限词' },
  { pattern: /最优/g, word: '最优', type: '极限词' },
  { pattern: /第一品牌/g, word: '第一品牌', type: '极限词' },
  { pattern: /全网第一/g, word: '全网第一', type: '极限词' },
  { pattern: /销量第一/g, word: '销量第一', type: '极限词' },
  { pattern: /全国第一/g, word: '全国第一', type: '极限词' },
  { pattern: /独一无二/g, word: '独一无二', type: '极限词' },
  { pattern: /绝无仅有/g, word: '绝无仅有', type: '极限词' },
  { pattern: /史无前例/g, word: '史无前例', type: '极限词' },
  { pattern: /领导者/g, word: '领导者', type: '极限词' },
  { pattern: /万能/g, word: '万能', type: '极限词' },
  { pattern: /神器/g, word: '神器', type: '极限词' },
  { pattern: /极致/g, word: '极致', type: '极限词' },
  { pattern: /完美/g, word: '完美', type: '极限词' },

  // ========== 医疗功效（小红书审核最严） ==========
  { pattern: /治疗/g, word: '治疗', type: '医疗功效' },
  { pattern: /治愈/g, word: '治愈', type: '医疗功效' },
  { pattern: /消炎/g, word: '消炎', type: '医疗功效' },
  { pattern: /杀菌/g, word: '杀菌', type: '医疗功效' },
  { pattern: /特效/g, word: '特效', type: '医疗功效' },
  { pattern: /抗癌/g, word: '抗癌', type: '医疗功效' },
  { pattern: /防癌/g, word: '防癌', type: '医疗功效' },
  { pattern: /降血糖/g, word: '降血糖', type: '医疗功效' },
  { pattern: /降血压/g, word: '降血压', type: '医疗功效' },
  { pattern: /无痛/g, word: '无痛', type: '医疗功效' },
  { pattern: /无创/g, word: '无创', type: '医疗功效' },
  { pattern: /增强免疫力/g, word: '增强免疫力', type: '医疗功效' },

  // ========== 形象类（服装/产品描述敏感） ==========
  { pattern: /明星同款/g, word: '明星同款', type: '形象违规' },
  { pattern: /原单/g, word: '原单', type: '形象违规' },
  { pattern: /尾单/g, word: '尾单', type: '形象违规' },
  { pattern: /外贸原单/g, word: '外贸原单', type: '形象违规' },

  // ========== 教育承诺 ==========
  { pattern: /保过/g, word: '保过', type: '教育承诺' },
  { pattern: /必过/g, word: '必过', type: '教育承诺' },
  { pattern: /包教包会/g, word: '包教包会', type: '教育承诺' },
  { pattern: /包毕业/g, word: '包毕业', type: '教育承诺' },
  { pattern: /免考/g, word: '免考', type: '教育承诺' },
  { pattern: /代考/g, word: '代考', type: '教育承诺' },
  { pattern: /赢在起跑线/g, word: '赢在起跑线', type: '制造焦虑' },

  // ========== 金融理财 ==========
  { pattern: /保本/g, word: '保本', type: '金融违规' },
  { pattern: /稳赚/g, word: '稳赚', type: '金融违规' },
  { pattern: /无风险/g, word: '无风险', type: '金融违规' },
  { pattern: /高收益/g, word: '高收益', type: '金融违规' },
  { pattern: /比特币/g, word: '比特币', type: '金融违规' },

  // ========== 虚假紧迫感 ==========
  { pattern: /仅限今天/g, word: '仅限今天', type: '虚假营销' },
  { pattern: /错过再无/g, word: '错过再无', type: '虚假营销' },
]

// 执行敏感词检测（纯本地，不依赖外部 API）
export async function checkSensitiveWords(text: string): Promise<{
  passed: boolean
  illegalWords?: { word: string; type: string }[]
}> {
  const foundMap = new Map<string, { word: string; type: string }>()

  for (const { pattern, word, type } of sensitivePatterns) {
    pattern.lastIndex = 0
    if (pattern.test(text)) {
      foundMap.set(word, { word, type })
    }
  }

  const illegalWords = Array.from(foundMap.values())
  return {
    passed: illegalWords.length === 0,
    illegalWords
  }
}

// 执行联网搜索
export async function performWebSearch(query: string): Promise<string> {
  try {
    // 这里可以接入其他搜索 API
    // 目前返回模拟结果
    return `[搜索结果] 关于"${query}"的最新信息...`
  } catch (error) {
    console.error('Web search error:', error)
    return `搜索"${query}"失败`
  }
}
