// src/lib/workflow/htmlTemplate.ts

import { htmlStyles, type HtmlStyle } from './htmlStyles'

export interface HtmlTemplateData {
  title: string
  content: string
  tags: string[]
  authorName?: string
  authorAvatar?: string
  style?: HtmlStyle
}

/**
 * 生成小红书风格分享卡 HTML
 */
export function generateNoteCardHtml(data: HtmlTemplateData): string {
  const { title, content, tags, authorName = '小红书博主', authorAvatar, style = 'magazine' } = data

  // 获取风格配置
  const styleConfig = htmlStyles[style]
  const { css } = styleConfig

  // 处理内容，限制显示长度
  const maxContentLength = 200
  const displayContent = content.length > maxContentLength
    ? content.substring(0, maxContentLength) + '...'
    : content

  const tagsHtml = tags.slice(0, 5).map(tag =>
    `<span style="display: inline-block; background: #fff5f5; color: #ff4d4f; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin: 4px;">#${tag}</span>`
  ).join('')

  const avatarHtml = authorAvatar
    ? `<img src="${authorAvatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />`
    : `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #ff6b6b, #ff4757); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">${authorName.charAt(0)}</div>`

  // 动态构建卡片样式
  const cardStyles = [
    `background: ${css.background}`,
    `border-radius: ${css.borderRadius || '24px'}`,
    `padding: 32px`,
    `max-width: 500px`,
    `margin: 0 auto`,
    `box-shadow: 0 10px 40px rgba(0,0,0,0.1)`,
    `color: ${css.color}`,
    css.borderLeft ? `border-left: ${css.borderLeft}` : ''
  ].filter(Boolean).join('; ')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: ${css.fontFamily};
      background: linear-gradient(135deg, #f5f5f5 0%, #fff 100%);
      min-height: 100vh;
      padding: 40px;
    }
    .card {
      ${cardStyles}
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    .avatar {
      margin-right: 12px;
    }
    .author-info {
      flex: 1;
    }
    .author-name {
      font-size: 14px;
      color: #333;
      font-weight: 600;
    }
    .follow-btn {
      background: linear-gradient(135deg, #ff6b6b, #ff4757);
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: ${css.color};
      margin-bottom: 16px;
      line-height: 1.4;
    }
    .content {
      font-size: 14px;
      color: #666;
      line-height: 1.8;
      margin-bottom: 20px;
      white-space: pre-wrap;
    }
    .tags {
      margin-bottom: 20px;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }
    .stats {
      display: flex;
      gap: 16px;
    }
    .stat {
      font-size: 12px;
      color: #999;
    }
    .brand {
      font-size: 12px;
      color: #ff4d4f;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="avatar">
        ${avatarHtml}
      </div>
      <div class="author-info">
        <div class="author-name">${authorName}</div>
      </div>
      <button class="follow-btn">关注</button>
    </div>
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="content">${escapeHtml(displayContent)}</p>
    <div class="tags">${tagsHtml}</div>
    <div class="footer">
      <div class="stats">
        <span class="stat">👍 0</span>
        <span class="stat">💬 0</span>
        <span class="stat">⭐ 0</span>
      </div>
      <span class="brand">小红书</span>
    </div>
  </div>
</body>
</html>
`
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
