// src/lib/workflow/pageLayout.ts
import type { VisualAsset } from './visualAsset'

export interface PageSection {
  type: 'title' | 'body' | 'tags' | 'divider'
  text: string
  style: {
    fontSize: number
    fontWeight: string
    color: string
    alignment: 'left' | 'center'
  }
}

export interface PageLayout {
  pageIndex: number
  type: 'cover' | 'content'
  sections: PageSection[]
}

// 根据字数计算页数
export function calculatePageCount(textLength: number): number {
  if (textLength <= 100) return 1
  if (textLength <= 200) return 2
  if (textLength <= 400) return 3
  if (textLength <= 600) return 4
  if (textLength <= 800) return 5
  if (textLength <= 1000) return 6
  if (textLength <= 1200) return 7
  return 8
}

// 解析笔记内容
function parseNoteContent(content: string, defaultTitle: string): { title: string; body: string; tags: string[] } {
  const titleMatch = content.match(/标题：(.+)/)
  const contentMatch = content.match(/正文：([\s\S]+?)(?:标签：|$)/)
  const tagsMatch = content.match(/标签：\[(.+)\]/) || content.match(/标签：(.+)/)
  return {
    title: titleMatch?.[1]?.trim() || defaultTitle,
    body: contentMatch?.[1]?.trim() || content,
    tags: tagsMatch?.[1]?.split(',').map(t => t.trim()).filter(Boolean) || [],
  }
}

// 将正文拆分为多段（按段落或按长度）
function splitBody(body: string, pageCount: number): string[] {
  if (pageCount <= 1) return ['']
  const contentPageCount = pageCount - 1 // 封面占 1 页
  if (contentPageCount <= 1) return [body]

  // 先按段落拆分
  const paragraphs = body.split(/\n+/).filter(p => p.trim())
  if (paragraphs.length >= contentPageCount) {
    // 按段落均匀分配
    const perPage = Math.ceil(paragraphs.length / contentPageCount)
    const pages: string[] = []
    for (let i = 0; i < contentPageCount; i++) {
      pages.push(paragraphs.slice(i * perPage, (i + 1) * perPage).join('\n'))
    }
    return pages
  }

  // 按字数均匀分配
  const perPageLen = Math.ceil(body.length / contentPageCount)
  const pages: string[] = []
  for (let i = 0; i < contentPageCount; i++) {
    pages.push(body.slice(i * perPageLen, (i + 1) * perPageLen))
  }
  return pages
}

// 创建完整布局
export function createPageLayouts(
  content: string,
  defaultTitle: string,
  asset: VisualAsset
): PageLayout[] {
  const { title, body, tags } = parseNoteContent(content, defaultTitle)
  const pageCount = calculatePageCount(body.length)
  const { titleSize, bodySize } = asset.typography
  const { textPrimary, textSecondary, accent } = asset.colorPalette
  const bodyPages = splitBody(body, pageCount)

  const layouts: PageLayout[] = []

  // 封面页
  const coverAlign = asset.layoutRules.coverLayout
  layouts.push({
    pageIndex: 0,
    type: 'cover',
    sections: [
      {
        type: 'title',
        text: title,
        style: {
          fontSize: Math.min(titleSize + 8, 32),
          fontWeight: 'bold',
          color: textPrimary,
          alignment: coverAlign === 'center' ? 'center' : 'left',
        },
      },
      ...(pageCount > 1 && bodyPages[0] ? [{
        type: 'body' as const,
        text: bodyPages[0].substring(0, 60),
        style: { fontSize: Math.max(bodySize - 1, 12), fontWeight: 'normal' as const, color: textSecondary, alignment: coverAlign === 'center' ? 'center' as const : 'left' as const },
      }] : []),
    ],
  })

  // 内容页
  for (let i = 1; i < pageCount; i++) {
    const bodyIndex = i - 1
    const pageBody = bodyPages[bodyIndex] || ''
    const sections: PageSection[] = []

    if (pageBody) {
      sections.push({
        type: 'body',
        text: pageBody,
        style: { fontSize: bodySize, fontWeight: 'normal', color: textPrimary, alignment: 'left' },
      })
    }

    // 标签放在最后一页
    if (tags.length > 0 && i === pageCount - 1) {
      sections.push({
        type: 'divider',
        text: '',
        style: { fontSize: 1, fontWeight: 'normal', color: accent, alignment: 'center' },
      })
      sections.push({
        type: 'tags',
        text: tags.slice(0, 5).map(t => `#${t}`).join('  '),
        style: { fontSize: Math.max(bodySize - 2, 12), fontWeight: 'normal', color: accent, alignment: 'left' },
      })
    }

    if (sections.length > 0) {
      layouts.push({ pageIndex: i, type: 'content', sections })
    }
  }

  return layouts
}
