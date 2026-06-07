// src/lib/workflow/htmlStyles.ts

export type HtmlStyle = 'magazine' | 'cream' | 'forest' | 'minimal' | 'dopamine'

export interface HtmlStyleConfig {
  name: string
  icon: string
  css: {
    background: string
    fontFamily: string
    color: string
    borderRadius?: string
    borderLeft?: string
  }
}

export const htmlStyles: Record<HtmlStyle, HtmlStyleConfig> = {
  magazine: {
    name: '杂志风',
    icon: '📰',
    css: {
      background: 'linear-gradient(135deg, #fff5f5 0%, #fef3e8 50%, #fff 100%)',
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: '#1a1a1a',
      borderLeft: '4px solid #e8455c',
    }
  },
  cream: {
    name: '奶油暖调',
    icon: '☕',
    css: {
      background: '#fef9f3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Nunito", sans-serif',
      color: '#5d4e37',
      borderRadius: '24px',
    }
  },
  forest: {
    name: '森林绿',
    icon: '🌲',
    css: {
      background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color: '#2e5d32',
      borderLeft: '4px solid #4caf50',
    }
  },
  minimal: {
    name: '瑞士极简',
    icon: '💠',
    css: {
      background: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      color: '#1a1a1a',
      borderRadius: '0',
      borderLeft: '1px solid #e5e5e5',
    }
  },
  dopamine: {
    name: '多巴胺',
    icon: '🎨',
    css: {
      background: 'linear-gradient(135deg, #fff0f5 0%, #f0f5ff 50%, #fffbe6 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color: '#6b4c9a',
      borderRadius: '16px',
    }
  }
}

// 计算 HTML 截图数量
export function calculateImageCount(contentLength: number): number {
  if (contentLength <= 100) return 1
  if (contentLength <= 300) return 2
  if (contentLength <= 600) return 3
  if (contentLength <= 1000) return 4
  return 5
}
