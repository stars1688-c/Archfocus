// src/lib/workflow/svgRenderer.ts
import type { VisualAsset } from './visualAsset'
import type { PageLayout } from './pageLayout'

const SVG_WIDTH = 500
const SVG_HEIGHT = 700

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// 生成分隔线 SVG
function renderDivider(style: string, color: string, width: number): string {
  const cx = SVG_WIDTH / 2
  const y = 0
  switch (style) {
    case 'dotted':
      return `<line x1="${cx - width/2}" y1="${y}" x2="${cx + width/2}" y2="${y}" stroke="${color}" stroke-width="2" stroke-dasharray="4,6"/>`
    case 'wave':
      return `<path d="M ${cx - width/2} ${y} Q ${cx - width/4} ${y - 6}, ${cx} ${y} Q ${cx + width/4} ${y + 6}, ${cx + width/2} ${y}" stroke="${color}" stroke-width="2" fill="none"/>`
    case 'geometric':
      return `<polygon points="${cx - 4},${y - 5} ${cx},${y + 5} ${cx + 4},${y - 5}" fill="${color}"/>`
    case 'line':
    default:
      return `<line x1="${cx - width/2}" y1="${y}" x2="${cx + width/2}" y2="${y}" stroke="${color}" stroke-width="1.5"/>`
  }
}

// 生成角落装饰
function renderCornerAccents(color: string): string {
  const s = 20, gap = 8, len = 15
  return `
    <path d="M ${gap} ${gap + s} L ${gap} ${gap} L ${gap + s} ${gap}" stroke="${color}" stroke-width="2" fill="none" opacity="0.3"/>
    <path d="M ${SVG_WIDTH - gap - s} ${gap} L ${SVG_WIDTH - gap} ${gap} L ${SVG_WIDTH - gap} ${gap + s}" stroke="${color}" stroke-width="2" fill="none" opacity="0.3"/>
    <path d="M ${gap} ${SVG_HEIGHT - gap - s} L ${gap} ${SVG_HEIGHT - gap} L ${gap + s} ${SVG_HEIGHT - gap}" stroke="${color}" stroke-width="2" fill="none" opacity="0.3"/>
    <path d="M ${SVG_WIDTH - gap - s} ${SVG_HEIGHT - gap} L ${SVG_WIDTH - gap} ${SVG_HEIGHT - gap} L ${SVG_WIDTH - gap} ${SVG_HEIGHT - gap - s}" stroke="${color}" stroke-width="2" fill="none" opacity="0.3"/>`
}

// 渲染背景纹理
function renderBackgroundPattern(pattern: string, color: string): string {
  if (pattern === 'none' || !pattern) return ''
  // 简单的点阵纹理
  if (pattern.includes('dot')) {
    return `<pattern id="dotPattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="1" fill="${color}" opacity="0.08"/>
    </pattern>`
  }
  return ''
}

// 渲染一页
export function renderPage(page: PageLayout, asset: VisualAsset): string {
  const { background, surface, textPrimary, textSecondary, accent } = asset.colorPalette
  const { dividerStyle, cornerAccents, backgroundPattern } = asset.decorations
  const { spacing, borderRadius } = asset.layoutRules
  const margin = Math.min(spacing + 10, 30) // 最多 30px 边距

  const patternDef = renderBackgroundPattern(backgroundPattern, textSecondary)
  const corners = cornerAccents ? renderCornerAccents(accent) : ''

  // 构建 SVG 内容
  let contentY = page.type === 'cover' ? SVG_HEIGHT * 0.25 : margin + 10

  const svgContent: string[] = []

  for (const section of page.sections) {
    const padding = 10

    if (section.type === 'title') {
      const fontSize = section.style.fontSize
      const y = contentY + fontSize
      svgContent.push(`<text x="${margin + padding}" y="${y}" font-size="${fontSize}" font-weight="${section.style.fontWeight}" fill="${section.style.color}" font-family="${asset.typography.titleFont}" text-anchor="${section.style.alignment === 'center' ? 'middle' : 'start'}" ${section.style.alignment === 'center' ? `x="${SVG_WIDTH / 2}"` : ''}>${escapeXml(section.text)}</text>`)
      contentY = y + fontSize * 0.6
    } else if (section.type === 'body') {
      const fontSize = section.style.fontSize
      const lineHeight = fontSize * 1.7
      const maxCharsPerLine = Math.floor((SVG_WIDTH - margin * 2 - padding * 2) / (fontSize * 0.9))

      // 自动换行
      const text = section.text
      // 先按段落拆分
      const paragraphs = text.split('\n')
      for (const para of paragraphs) {
        if (!para.trim()) { contentY += lineHeight * 0.5; continue }

        // 按字符拆行
        let remaining = para
        while (remaining.length > 0) {
          let lineLen = Math.min(remaining.length, maxCharsPerLine)
          let line = remaining.slice(0, lineLen)

          // 内容页超出底部时截断
          if (contentY + lineHeight > SVG_HEIGHT - margin) {
            line = line.slice(0, Math.max(line.length - 3, 0)) + '...'
            svgContent.push(`<text x="${margin + padding}" y="${contentY}" font-size="${fontSize}" fill="${section.style.color}" font-family="${asset.typography.bodyFont}">${escapeXml(line)}</text>`)
            remaining = ''
            break
          }

          svgContent.push(`<text x="${margin + padding}" y="${contentY}" font-size="${fontSize}" fill="${section.style.color}" font-family="${asset.typography.bodyFont}">${escapeXml(line)}</text>`)
          remaining = remaining.slice(lineLen)
          contentY += lineHeight
        }
      }
    } else if (section.type === 'tags') {
      const fontSize = section.style.fontSize
      contentY += fontSize * 0.8
      svgContent.push(
        renderDivider(dividerStyle, accent, 100),
        `<text x="${margin + padding}" y="${contentY + fontSize}" font-size="${fontSize}" fill="${section.style.color}" font-family="${asset.typography.bodyFont}">${escapeXml(section.text)}</text>`
      )
    } else if (section.type === 'divider') {
      contentY += spacing * 0.5
      svgContent.push(renderDivider(dividerStyle, accent, 60))
      contentY += spacing * 0.5
    }
  }

  // 构建完整 SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">
  <defs>
    ${patternDef}
  </defs>
  <!-- 背景 -->
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${background}"/>
  ${backgroundPattern !== 'none' ? `<rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="url(#dotPattern)"/>` : ''}
  <!-- 内容区背景 -->
  <rect x="${margin}" y="${margin}" width="${SVG_WIDTH - margin * 2}" height="${SVG_HEIGHT - margin * 2}" rx="${borderRadius === '0' ? 0 : parseInt(borderRadius)}" fill="${surface}" opacity="0.5"/>
  ${corners}
  <!-- 内容 -->
  ${svgContent.join('\n  ')}
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// 渲染所有页面
export function renderAllPages(layouts: PageLayout[], asset: VisualAsset): string[] {
  return layouts.map(page => renderPage(page, asset))
}
