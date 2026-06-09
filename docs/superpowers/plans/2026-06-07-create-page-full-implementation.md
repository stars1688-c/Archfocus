# 创作页面完整实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 按照 prototype/index.html 和 SSD.md 规格，实现完整的创作页面四步向导

**架构：** React + Next.js + TailwindCSS，前端状态管理，后端 API 调用

**技术栈：** Next.js App Router, React Hooks, TailwindCSS

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| 修改 | `src/app/(dashboard)/create/page.tsx` | 创作页面主组件 |
| 修改 | `src/lib/api.ts` | API 调用方法 |
| 创建 | `src/components/create/TopicCard.tsx` | 选题卡片组件 |
| 创建 | `src/components/create/ImageGrid.tsx` | 图片网格组件 |
| 创建 | `src/components/create/ImageItem.tsx` | 单张图片组件 |
| 创建 | `src/components/create/HtmlStyleSelector.tsx` | HTML 风格选择器 |
| 创建 | `src/components/create/CopyButton.tsx` | 复制按钮组件 |
| 创建 | `src/components/modals/ScheduleModal.tsx` | 定时发布弹窗 |
| 创建 | `src/components/modals/RegenerateModal.tsx` | 重新生成反馈弹窗 |
| 创建 | `src/lib/workflow/htmlStyles.ts` | 5种HTML风格模板 |

---

## 任务 1：添加类型定义和状态

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：添加新的类型定义**

```typescript
// 在 create/page.tsx 顶部添加

// 数据源类型
interface DataSource {
  webSearch: boolean
  hotWords: boolean
}

// HTML 风格类型
type HtmlStyle = 'magazine' | 'cream' | 'forest' | 'minimal' | 'dopamine'

// 配图类型
type ImageType = 'ai_prompt' | 'html_screenshot'

// 定时发布
interface Schedule {
  enabled: boolean
  time: Date | null
  emailReminder: boolean
  email: string
}
```

- [ ] **步骤 2：更新状态定义**

```typescript
// 替换现有的 aiLoading, showTopicModal 等状态

// Step 1 状态
const [dataSource, setDataSource] = useState<DataSource>({
  webSearch: true,
  hotWords: false
})
const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

// Step 2 状态
const [writingRequirements, setWritingRequirements] = useState('')

// Step 3 状态
const [imageType, setImageType] = useState<ImageType>('ai_prompt')
const [aiImageModel, setAiImageModel] = useState<'gpt-image-2' | 'doubao-seedream-5-0-lite'>('gpt-image-2')
const [imageCount, setImageCount] = useState(1)
const [htmlStyle, setHtmlStyle] = useState<HtmlStyle>('magazine')
const [generatedImages, setGeneratedImages] = useState<string[]>([])
const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)

// Step 4 状态
const [schedule, setSchedule] = useState<Schedule>({
  enabled: false,
  time: null,
  emailReminder: true,
  email: ''
})

// 弹窗状态
const [showScheduleModal, setShowScheduleModal] = useState(false)
const [showRegenerateModal, setShowRegenerateModal] = useState(false)
const [regenerateFeedback, setRegenerateFeedback] = useState('')
```

- [ ] **步骤 3：验证 TypeScript**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 4：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 添加创作页面类型定义和状态"
```

---

## 任务 2：实现发布账号文本显示

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：替换下拉框为文本显示**

找到 Step 1 中的 Header 组件，修改 rightContent：

```tsx
<Header
  title="创作新笔记"
  rightContent={
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">发布账号：</span>
      <span className="font-medium text-primary">
        {selectedAccount?.name || '未选择'}
      </span>
      {selectedAccount?.xiaohongshuId && (
        <span className="text-gray-400 text-xs">
          小红书 ID: {selectedAccount.xiaohongshuId}
        </span>
      )}
    </div>
  }
/>
```

- [ ] **步骤 2：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 发布账号显示为文本形式"
```

---

## 任务 3：实现数据源多选

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：添加数据源 Toggle 按钮**

在 Step 1 的 wizard-body 中，找到数据源部分，替换为：

```tsx
{/* 数据源多选 */}
<div className="form-group">
  <label className="block text-sm font-medium text-gray-500 mb-2">数据源（可多选）</label>
  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      onClick={() => setDataSource(prev => ({ ...prev, webSearch: !prev.webSearch }))}
      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
        dataSource.webSearch
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
      }`}
    >
      🌐 联网搜索
    </button>
    <button
      type="button"
      onClick={() => setDataSource(prev => ({ ...prev, hotWords: !prev.hotWords }))}
      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
        dataSource.hotWords
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
      }`}
    >
      🔥 小红书行业热点词
    </button>
  </div>
</div>
```

- [ ] **步骤 2：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 实现数据源多选功能"
```

---

## 任务 4：更新选题卡片显示理由

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：更新选题卡片渲染**

在选题结果展示部分，更新渲染逻辑：

```tsx
<div id="topicsResult" className="space-y-3">
  <label className="block text-sm font-medium text-gray-500">
    推荐主题（点击选择）
  </label>
  {generatedTopics.map((topic, index) => (
    <button
      key={index}
      onClick={() => {
        setSelectedTopic(topic.title)
        setTitle(topic.title)
      }}
      className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
        selectedTopic === topic.title
          ? 'border-primary bg-primary-bg'
          : 'border-gray-100 hover:border-primary/30'
      }`}
    >
      <div className="font-medium text-primary">{topic.title}</div>
      <div className="text-xs text-gray-500 mt-1">{topic.reason}</div>
    </button>
  ))}
</div>
```

- [ ] **步骤 2：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 选题卡片显示推荐理由"
```

---

## 任务 5：添加写作要求输入框

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：在文案步骤添加写作要求**

在 Step 2 的 wizard-body 中，找到选题输入后添加：

```tsx
<div className="form-group">
  <label className="block text-sm font-medium text-gray-500 mb-1.5">
    写作要求（可选）
  </label>
  <textarea
    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-primary resize-none"
    rows={3}
    placeholder="可以补充语气风格、字数要求、关键词等..."
    value={writingRequirements}
    onChange={(e) => setWritingRequirements(e.target.value)}
  />
  <p className="text-xs text-gray-400 mt-1">💡 可以直接在AI生成的文案进行修改</p>
</div>
```

- [ ] **步骤 2：在 API 调用中传递写作要求**

修改 handleGenerateContentWithTitle：

```typescript
const res = await api.post('/workflow', {
  account: {
    id: selectedAccount.id,
    name: selectedAccount.name,
    position: selectedAccount.position,
    audience: selectedAccount.audience,
    description: selectedAccount.description,
  },
  selectedTopic: title,
  searchEnabled: dataSource.webSearch,  // 使用多选状态
  userRequirements: writingRequirements,  // 新增
  currentStep: 'content_generation'
})
```

- [ ] **步骤 3：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 4：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 添加写作要求输入框"
```

---

## 任务 6：实现 contenteditable 文案编辑

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：替换文案显示为 contenteditable**

找到文案结果展示部分：

```tsx
{/* 可编辑的文案 */}
<div
  contentEditable
  className="w-full p-5 bg-gray-50 rounded-xl border-l-4 border-primary outline-none min-h-[200px] whitespace-pre-wrap leading-relaxed"
  onBlur={(e) => setContent(e.currentTarget.textContent || '')}
  suppressContentEditableWarning
>
  {humanizedContent || content}
</div>
<p className="text-xs text-gray-400 mt-1">💡 可直接点击文案内容进行修改</p>
```

- [ ] **步骤 2：添加 suppressContentEditableWarning 忽略警告**

在组件顶部添加：

```typescript
import { useState, useEffect, useRef } from 'react'
// suppressContentEditableWarning 通过在同一个周期内更新子元素来避免
```

- [ ] **步骤 3：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 4：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 实现 contenteditable 文案编辑"
```

---

## 任务 7：实现 AI 生图数量选择 (1-9)

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：添加生图数量输入**

在 Step 3 的 AI+提示词模式下，找到模型选择后添加：

```tsx
<div className="form-group">
  <label className="block text-sm font-medium text-gray-500 mb-1.5">生图数量</label>
  <div className="flex items-center gap-3">
    <input
      type="number"
      min={1}
      max={9}
      value={imageCount}
      onChange={(e) => setImageCount(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
      className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-center outline-none focus:border-primary"
    />
    <span className="text-sm text-gray-500">张（封面尺寸 3:4）</span>
  </div>
</div>
```

- [ ] **步骤 2：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 实现生图数量 1-9 选择"
```

---

## 任务 8：实现 HTML 风格选择器

**文件：**
- 创建：`src/lib/workflow/htmlStyles.ts`

- [ ] **步骤 1：创建 HTML 风格模板**

```typescript
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
```

- [ ] **步骤 2：验证 TypeScript**

运行：`npx tsc --noEmit`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/workflow/htmlStyles.ts
git commit -m "feat: 创建 HTML 风格模板配置"
```

---

## 任务 9：更新 HTML 截图节点支持风格

**文件：**
- 修改：`src/lib/workflow/imageNodes.ts`
- 修改：`src/lib/workflow/htmlTemplate.ts`

- [ ] **步骤 1：更新 htmlTemplate.ts 支持风格**

```typescript
// src/lib/workflow/htmlTemplate.ts

import { htmlStyles, type HtmlStyle } from './htmlStyles'

export interface HtmlTemplateData {
  title: string
  content: string
  tags: string[]
  authorName?: string
  authorAvatar?: string
  style?: HtmlStyle  // 新增
}

export function generateNoteCardHtml(data: HtmlTemplateData): string {
  const { title, content, tags, authorName = '小红书博主', authorAvatar, style = 'magazine' } = data

  const styleConfig = htmlStyles[style]
  const { css } = styleConfig

  // ... 其余代码保持不变，使用 css 变量
}
```

- [ ] **步骤 2：更新 imageNodes.ts 传递风格**

修改 htmlScreenshotNode：

```typescript
// HTML 截图节点
export async function htmlScreenshotNode(state: ImageWorkflowState): Promise<Partial<ImageWorkflowState>> {
  // ...
  const html = generateNoteCardHtml({
    title: parsedTitle,
    content: parsedContent,
    tags: parsedTags,
    style: (state.htmlStyle as HtmlStyle) || 'magazine'  // 传递风格
  })
  // ...
}
```

- [ ] **步骤 3：更新 ImageWorkflowState 添加 htmlStyle**

修改 `src/lib/workflow/state.ts`：

```typescript
export interface ImageWorkflowState {
  // ...
  htmlStyle?: HtmlStyle
  // ...
}
```

- [ ] **步骤 4：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 5：Commit**

```bash
git add src/lib/workflow/imageNodes.ts src/lib/workflow/htmlTemplate.ts src/lib/workflow/state.ts
git commit -m "feat: HTML 截图支持风格选择"
```

---

## 任务 10：实现图片预览网格

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：添加图片网格组件**

在 Step 3 底部添加：

```tsx
{/* 图片预览网格 */}
<div className="grid grid-cols-3 gap-3 mt-4">
  {[0, 1, 2, 3, 4, 5].map((index) => (
    <button
      key={index}
      onClick={() => setSelectedImageIndex(index)}
      className={`aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
        selectedImageIndex === index
          ? 'border-primary bg-primary-bg'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {generatedImages[index] ? (
        <img
          src={generatedImages[index]}
          alt={`图片 ${index + 1}`}
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        <>
          <span className="text-2xl mb-1">🖼️</span>
          <span className="text-xs text-gray-400">
            {index === 0 ? '封面图' : `图${index + 1}`}
          </span>
        </>
      )}
    </button>
  ))}
</div>
```

- [ ] **步骤 2：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 实现图片预览网格"
```

---

## 任务 11：创建定时发布弹窗

**文件：**
- 创建：`src/components/modals/ScheduleModal.tsx`

- [ ] **步骤 1：创建定时发布弹窗组件**

```tsx
// src/components/modals/ScheduleModal.tsx

'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ScheduleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSchedule: (schedule: {
    time: Date
    emailReminder: boolean
    email: string
  }) => void
  defaultEmail?: string
}

export function ScheduleModal({ open, onOpenChange, onSchedule, defaultEmail = '' }: ScheduleModalProps) {
  const [quickSelect, setQuickSelect] = useState<'tomorrow' | 'dayafter' | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [emailReminder, setEmailReminder] = useState(true)
  const [email, setEmail] = useState(defaultEmail)

  const handleQuickSelect = (type: 'tomorrow' | 'dayafter') => {
    setQuickSelect(type)
    const d = new Date()
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1)
    } else {
      d.setDate(d.getDate() + 2)
    }
    setDate(d.toISOString().split('T')[0])
  }

  const handleConfirm = () => {
    if (!date) return
    const scheduledTime = new Date(`${date}T${time}`)
    onSchedule({
      time: scheduledTime,
      emailReminder,
      email
    })
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <h3>⏰ 定时发布</h3>
        </ModalHeader>
        <ModalBody>
          {/* 快捷选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-500 mb-2">快捷选择</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleQuickSelect('tomorrow')}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  quickSelect === 'tomorrow'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                明天晚上7点
              </button>
              <button
                onClick={() => handleQuickSelect('dayafter')}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  quickSelect === 'dayafter'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                后天晚上7点
              </button>
            </div>
          </div>

          {/* 自定义时间 */}
          <div className="border-t pt-4 mb-4">
            <label className="block text-sm font-medium text-gray-500 mb-2">自定义时间</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">日期</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    setQuickSelect(null)
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">时间</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 邮件提醒 */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailReminder}
                onChange={(e) => setEmailReminder(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">提前10分钟邮件提醒</span>
            </label>
            {emailReminder && (
              <div className="mt-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="接收提醒的邮箱"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!date}>
            确认定时
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

- [ ] **步骤 2：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/components/modals/ScheduleModal.tsx
git commit -m "feat: 创建定时发布弹窗"
```

---

## 任务 12：创建重新生成反馈弹窗

**文件：**
- 创建：`src/components/modals/RegenerateModal.tsx`

- [ ] **步骤 1：创建弹窗组件**

```tsx
// src/components/modals/RegenerateModal.tsx

'use client'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface RegenerateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegenerate: (feedback: string) => void
}

export function RegenerateModal({ open, onOpenChange, onRegenerate }: RegenerateModalProps) {
  const [feedback, setFeedback] = useState('')

  const handleConfirm = () => {
    if (!feedback.trim()) return
    onRegenerate(feedback)
    setFeedback('')
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <h3>🔄 重新生成文案</h3>
        </ModalHeader>
        <ModalBody>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              修改意见 <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-primary resize-none"
              rows={4}
              placeholder="请描述你希望如何修改，比如：语气更活泼一些、增加产品对比、缩短到300字以内..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!feedback.trim()}>
            确认重新生成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

- [ ] **步骤 2：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/components/modals/RegenerateModal.tsx
git commit -m "feat: 创建重新生成反馈弹窗"
```

---

## 任务 13：实现复制功能

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：添加复制函数和按钮**

```typescript
// 复制文本
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // 可选：显示 toast
    alert('已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
}
```

- [ ] **步骤 2：在 Step 4 添加复制按钮**

```tsx
{/* 笔记标题 */}
<div className="bg-gray-50 rounded-xl p-4">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-xs text-gray-500 mb-1">笔记标题</div>
      <div className="font-medium">{title}</div>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyText(title)}
    >
      📋 复制
    </Button>
  </div>
</div>

{/* 笔记内容 */}
<div className="bg-gray-50 rounded-xl p-4">
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1">
      <div className="text-xs text-gray-500 mb-1">笔记内容</div>
      <div className="whitespace-pre-wrap">{content}</div>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyText(content)}
    >
      📋 复制
    </Button>
  </div>
</div>

{/* 笔记配图列表 */}
{generatedImages.length > 0 && (
  <div className="space-y-2">
    <div className="text-xs text-gray-500">笔记配图（{generatedImages.length}张，点击复制）</div>
    {generatedImages.map((img, index) => (
      <div
        key={index}
        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
      >
        <div className="w-9 h-12 bg-white rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">
          {index === 0 ? '封面' : `图${index + 1}`}
        </div>
        <img src={img} alt={`配图${index + 1}`} className="h-12 w-auto rounded" />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => copyText(img)}
        >
          📋 复制
        </Button>
      </div>
    ))}
  </div>
)}
```

- [ ] **步骤 3：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 4：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 实现复制功能"
```

---

## 任务 14：集成定时发布弹窗

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：导入并使用 ScheduleModal**

```tsx
import { ScheduleModal } from '@/components/modals/ScheduleModal'

// 在 return JSX 中添加
<ScheduleModal
  open={showScheduleModal}
  onOpenChange={setShowScheduleModal}
  onSchedule={(schedule) => {
    setSchedule({
      enabled: true,
      time: schedule.time,
      emailReminder: schedule.emailReminder,
      email: schedule.email
    })
  }}
  defaultEmail={schedule.email}
/>
```

- [ ] **步骤 2：在 Step 4 绑定定时发布按钮**

```tsx
<Button
  variant="outline"
  size="lg"
  className="flex-1"
  onClick={() => setShowScheduleModal(true)}
>
  ⏰ 定时发布
</Button>
```

- [ ] **步骤 3：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 4：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 集成定时发布弹窗"
```

---

## 任务 15：集成重新生成反馈弹窗

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：导入并使用 RegenerateModal**

```tsx
import { RegenerateModal } from '@/components/modals/RegenerateModal'

// 在 return JSX 中添加
<RegenerateModal
  open={showRegenerateModal}
  onOpenChange={setShowRegenerateModal}
  onRegenerate={(feedback) => {
    // 调用重新生成 API
    handleRegenerateWithFeedback(feedback)
  }}
/>
```

- [ ] **步骤 2：更新 handleRegenerateWithFeedback 函数**

```typescript
const handleRegenerateWithFeedback = async (feedback: string) => {
  // 复用现有的重新生成逻辑
  setUserFeedback(feedback)
  // 触发重新生成...
}
```

- [ ] **步骤 3：在 Step 2 绑定重新生成按钮**

```tsx
<Button
  variant="ghost"
  className="text-orange-500"
  onClick={() => setShowRegenerateModal(true)}
>
  🔄 重新生成
</Button>
```

- [ ] **步骤 4：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 5：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 集成重新生成反馈弹窗"
```

---

## 任务 16：更新 API 传递数据源多选

**文件：**
- 修改：`src/app/(dashboard)/create/page.tsx`

- [ ] **步骤 1：更新所有 API 调用传递完整数据源**

```typescript
// handleGenerateTopics
const res = await api.post('/workflow', {
  account: { ... },
  searchEnabled: dataSource.webSearch,  // 使用 dataSource
  currentStep: 'topic_generation'
})

// handleGenerateContentWithTitle
const res = await api.post('/workflow', {
  account: { ... },
  selectedTopic: title,
  searchEnabled: dataSource.webSearch,
  userRequirements: writingRequirements,
  currentStep: 'content_generation'
})
```

- [ ] **步骤 2：验证构建**

运行：`npm run build 2>&1 | tail -20`
预期：编译成功

- [ ] **步骤 3：Commit**

```bash
git add src/app/(dashboard)/create/page.tsx
git commit -m "feat: 更新 API 传递数据源多选状态"
```

---

## 验证清单

完成所有任务后，运行以下验证：

```bash
# 1. TypeScript 检查
npx tsc --noEmit

# 2. 构建检查
npm run build

# 3. 验证文件结构
ls -la src/components/create/
ls -la src/components/modals/
ls -la src/lib/workflow/
```

---

## 验收标准

| 功能 | 状态 |
|------|------|
| 发布账号文本显示 | ⬜ |
| 数据源多选 | ⬜ |
| 推荐主题理由 | ⬜ |
| 写作要求输入框 | ⬜ |
| contenteditable 编辑 | ⬜ |
| AI 生图数量 1-9 | ⬜ |
| HTML 5 种风格 | ⬜ |
| HTML 自动分页 | ⬜ |
| 图片预览网格 | ⬜ |
| 复制功能 | ⬜ |
| 定时发布弹窗 | ⬜ |
| 邮件提醒 | ⬜ |
| 重新生成弹窗 | ⬜ |

---

## 下一步

1. 连接后端 API 实现完整流程
2. 添加笔记保存到草稿功能
3. 集成笔记库页面
