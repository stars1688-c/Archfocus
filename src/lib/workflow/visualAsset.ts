// src/lib/workflow/visualAsset.ts

import { callMiniMax } from '../ai/client'
import { performWebSearch } from './webSearch'

export type StylePreset = 'magazine' | 'cream' | 'forest' | 'minimal' | 'dopamine'

export interface VisualAsset {
  colorPalette: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    textPrimary: string
    textSecondary: string
  }
  typography: {
    titleFont: string
    bodyFont: string
    titleSize: number
    bodySize: number
  }
  layoutRules: {
    coverLayout: 'center' | 'top' | 'left'
    contentLayout: 'single' | 'two-column'
    spacing: number
    borderRadius: string
  }
  decorations: {
    dividerStyle: 'line' | 'dotted' | 'wave' | 'geometric'
    cornerAccents: boolean
    backgroundPattern: string
    accentShapes: string[]
  }
  styleName: string
  pageCount: number
}

// 每个风格预设的 fallback VisualAsset
export const STYLE_FALLBACKS: Record<StylePreset, Partial<VisualAsset>> = {
  magazine: {
    colorPalette: { primary: '#e8455c', secondary: '#fef3e8', accent: '#ff6b6b', background: '#fff5f5', surface: '#ffffff', textPrimary: '#1a1a1a', textSecondary: '#666666' },
    typography: { titleFont: 'Georgia, serif', bodyFont: 'Georgia, serif', titleSize: 22, bodySize: 15 },
    layoutRules: { coverLayout: 'center', contentLayout: 'single', spacing: 20, borderRadius: '0' },
    decorations: { dividerStyle: 'line', cornerAccents: true, backgroundPattern: 'none', accentShapes: [] },
    styleName: '杂志风',
    pageCount: 1,
  },
  cream: {
    colorPalette: { primary: '#5d4e37', secondary: '#fef9f3', accent: '#c9a96e', background: '#fef9f3', surface: '#ffffff', textPrimary: '#5d4e37', textSecondary: '#8b7d6b' },
    typography: { titleFont: '"Nunito", sans-serif', bodyFont: 'sans-serif', titleSize: 22, bodySize: 15 },
    layoutRules: { coverLayout: 'center', contentLayout: 'single', spacing: 20, borderRadius: '24px' },
    decorations: { dividerStyle: 'wave', cornerAccents: false, backgroundPattern: 'none', accentShapes: ['circle'] },
    styleName: '奶油暖调',
    pageCount: 1,
  },
  forest: {
    colorPalette: { primary: '#2e5d32', secondary: '#e8f5e9', accent: '#4caf50', background: '#e8f5e9', surface: '#ffffff', textPrimary: '#2e5d32', textSecondary: '#558b2f' },
    typography: { titleFont: 'sans-serif', bodyFont: 'sans-serif', titleSize: 22, bodySize: 15 },
    layoutRules: { coverLayout: 'center', contentLayout: 'single', spacing: 20, borderRadius: '0' },
    decorations: { dividerStyle: 'line', cornerAccents: true, backgroundPattern: 'none', accentShapes: ['leaf'] },
    styleName: '森林绿',
    pageCount: 1,
  },
  minimal: {
    colorPalette: { primary: '#1a1a1a', secondary: '#f5f5f5', accent: '#333333', background: '#ffffff', surface: '#fafafa', textPrimary: '#1a1a1a', textSecondary: '#888888' },
    typography: { titleFont: '"SF Pro Display", sans-serif', bodyFont: 'sans-serif', titleSize: 20, bodySize: 14 },
    layoutRules: { coverLayout: 'left', contentLayout: 'single', spacing: 24, borderRadius: '0' },
    decorations: { dividerStyle: 'line', cornerAccents: false, backgroundPattern: 'none', accentShapes: ['square'] },
    styleName: '瑞士极简',
    pageCount: 1,
  },
  dopamine: {
    colorPalette: { primary: '#6b4c9a', secondary: '#fff0f5', accent: '#ff6b9d', background: '#fff0f5', surface: '#ffffff', textPrimary: '#6b4c9a', textSecondary: '#b08fc7' },
    typography: { titleFont: 'sans-serif', bodyFont: 'sans-serif', titleSize: 24, bodySize: 15 },
    layoutRules: { coverLayout: 'center', contentLayout: 'single', spacing: 16, borderRadius: '16px' },
    decorations: { dividerStyle: 'dotted', cornerAccents: true, backgroundPattern: 'none', accentShapes: ['star', 'circle'] },
    styleName: '多巴胺',
    pageCount: 1,
  },
}

// 合并 fallback：用风格预设的默认值填充缺失字段
export function getFallbackAsset(style: StylePreset): VisualAsset {
  const base = STYLE_FALLBACKS[style]
  return JSON.parse(JSON.stringify(base)) as VisualAsset
}

export interface GenerateVisualAssetOptions {
  content: string
  title: string
  tags: string[]
  style: StylePreset
  enableSearch?: boolean
}

// 从内容中解析标题、正文、标签
function parseContent(content: string, title?: string): { noteTitle: string; bodyText: string; tags: string[] } {
  const titleMatch = content.match(/标题：(.+)/)
  const contentMatch = content.match(/正文：([\s\S]+?)(?:标签：|$)/)
  const tagsMatch = content.match(/标签：\[(.+)\]/) || content.match(/标签：(.+)/)
  return {
    noteTitle: titleMatch?.[1]?.trim() || title || '',
    bodyText: contentMatch?.[1]?.trim() || content || '',
    tags: tagsMatch?.[1]?.split(',').map(t => t.trim()).filter(Boolean) || [],
  }
}

// 生成视觉资产
export async function generateVisualAsset(options: GenerateVisualAssetOptions): Promise<VisualAsset> {
  const { content, title, tags, style, enableSearch = true } = options
  const { noteTitle, bodyText } = parseContent(content, title)

  // 1. 可选：联网搜索视觉参考
  let searchContext = ''
  if (enableSearch && noteTitle) {
    try {
      const searchQuery = `${noteTitle} 小红书笔记 卡片设计 配色 排版`
      searchContext = await performWebSearch(searchQuery)
    } catch {
      // 搜索失败，跳过
    }
  }

  // 2. 构建 AI prompt
  const systemPrompt = `你是小红书视觉设计专家，擅长根据笔记内容生成视觉设计方案。

你需要分析笔记内容，输出一个完整的视觉资产规范（JSON），包含配色、字体、布局和装饰方案。

风格基础约束（${style}）：
${JSON.stringify(STYLE_FALLBACKS[style])}

规则：
1. 根据内容的主题情感基调确定色彩方案（美食→暖色系、科技→冷色系、知识→清新色系）
2. 在上述风格约束基础上做动态调整，不要完全脱离基础风格
3. 封面布局：标题有冲击力→center；偏长文→top；极简内容→left
4. 内页布局：列表型内容→two-column；故事型→single
5. 装饰元素根据内容情绪选择（活泼→dotted/wave，专业→line，创意→geometric）
6. 左右上下不要大面积留白，内容紧凑填充

必须输出纯 JSON，不要带 Markdown 标记。JSON 字段：
- colorPalette: { primary, secondary, accent, background, surface, textPrimary, textSecondary }（hex颜色）
- typography: { titleFont, bodyFont, titleSize（18-28）, bodySize（13-16）}
- layoutRules: { coverLayout（"center"|"top"|"left"）, contentLayout（"single"|"two-column"）, spacing（12-28）, borderRadius（"0"|"8px"|"16px"|"24px"）}
- decorations: { dividerStyle（"line"|"dotted"|"wave"|"geometric"）, cornerAccents（true|false）, backgroundPattern（"none"|描述）, accentShapes（字符串数组）}
- styleName: 中文风格名称
- pageCount: 根据正文长度估算的页数`

  const userMessage = `笔记标题：${noteTitle}
正文内容：${bodyText}
标签：${tags.join(', ')}
${searchContext ? `\n视觉参考搜索结果：\n${searchContext}` : ''}`

  // 3. 调用 MiniMax
  const response = await callMiniMax(systemPrompt, userMessage)

  // 4. 解析 JSON 并 fallback
  try {
    // 找到 JSON 部分（可能有前后文字包裹）
    const jsonStr = response.text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(jsonStr)
    const fallback = getFallbackAsset(style)
    return {
      colorPalette: { ...fallback.colorPalette, ...parsed.colorPalette },
      typography: { ...fallback.typography, ...parsed.typography },
      layoutRules: { ...fallback.layoutRules, ...parsed.layoutRules },
      decorations: { ...fallback.decorations, ...parsed.decorations },
      styleName: parsed.styleName || fallback.styleName,
      pageCount: parsed.pageCount || fallback.pageCount,
    }
  } catch {
    // fallback 到风格预设
    return getFallbackAsset(style)
  }
}
