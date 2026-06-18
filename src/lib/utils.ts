// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 从 Xiaohongshu URL 中提取 note ID，构造 PC 网页能打开的链接
 * 手机端 URL 可能为 xhslink.com/xxx 或 app 格式，PC 端需转为标准 web URL
 */
export function getPCNoteUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined

  // 已经是标准 web URL，直接返回
  if (url.includes('xiaohongshu.com/explore/')) return url

  // 尝试从 URL 中提取 note ID（最后一段路径）
  const noteIdMatch = url.match(/\/([a-zA-Z0-9]{20,})$/)
  if (noteIdMatch) {
    return `https://www.xiaohongshu.com/explore/${noteIdMatch[1]}`
  }

  // 尝试匹配 xhslink.com/xxx 格式
  const xhsLinkMatch = url.match(/xhslink\.com\/([a-zA-Z0-9]+)/)
  if (xhsLinkMatch) {
    return `https://www.xiaohongshu.com/explore/${xhsLinkMatch[1]}`
  }

  // 兜底：返回原 URL
  return url
}

// 复制到剪贴板（兼容 HTTP 和手机端）
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 首选 Clipboard API（HTTPS / localhost 环境）
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 降级到 textarea 方式
  }

  // 降级方案：textarea + execCommand（HTTP / 老旧浏览器）
  // 注意：手机端 input/textarea 必须插入 document 且 opacity > 0 才能复制成功
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.width = '1px'
    textarea.style.height = '1px'
    textarea.style.opacity = '0.01' // 手机端需要 > 0，否则 execCommand 失败
    textarea.style.pointerEvents = 'none'
    textarea.style.zIndex = '9999'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch {
    return false
  }
}