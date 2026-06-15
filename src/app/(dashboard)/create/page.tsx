// src/app/(dashboard)/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccountStore } from '@/stores/account-store'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { ScheduleModal } from '@/components/modals/ScheduleModal'
import { RegenerateModal } from '@/components/modals/RegenerateModal'
import api from '@/lib/api'
import { copyToClipboard } from '@/lib/utils'
import type { Topic } from '@/lib/ai/types'

// 工作流步骤日志类型
interface StepLog {
  step: string
  status: 'running' | 'success' | 'error' | 'skipped'
  message: string
  durationMs?: number
}

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

const STEPS = ['选题', '文案', '配图', '发布']

export default function CreatePage() {
  const router = useRouter()
  const { accounts, selectedAccountId, selectAccount, getSelectedAccount, setAccounts } = useAccountStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // AI states
  const [aiLoading, setAiLoading] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)
  const [generatedTopics, setGeneratedTopics] = useState<Topic[]>([])
  const [rawContent, setRawContent] = useState('')
  const [humanizedContent, setHumanizedContent] = useState('')
  const [sensitiveWords, setSensitiveWords] = useState<{ word: string; type: string }[]>([])
  const [sensitivePassed, setSensitivePassed] = useState(true)
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState('')
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [stepLogs, setStepLogs] = useState<StepLog[]>([])
  const [userFeedback, setUserFeedback] = useState('')

  // Image generation states
  const [imageType, setImageType] = useState<'ai_prompt' | 'html_screenshot'>('ai_prompt')
  const [imageModel, setImageModel] = useState<string>('gpt-image-2')
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [imageGenerating, setImageGenerating] = useState(false)
  const [promptConfirmed, setPromptConfirmed] = useState(false) // 提示词是否已确认

  // Toast 提示状态
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  // Step 1 状态
  const [dataSource, setDataSource] = useState<DataSource>({
    webSearch: true,
    hotWords: false
  })
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [hotKeywords, setHotKeywords] = useState<string[]>([])
  const [hotKeywordsLoading, setHotKeywordsLoading] = useState(false)

  // 加载账号列表
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await api.get('/accounts')
        if (res.data.success && res.data.data.length > 0) {
          setAccounts(res.data.data)
          // 自动选择第一个账号
          if (!selectedAccountId) {
            selectAccount(res.data.data[0].id)
          }
        }
      } catch (error) {
        console.error('Load accounts error:', error)
      }
    }
    loadAccounts()
  }, [])

  // 获取热点词
  useEffect(() => {
    if (dataSource.hotWords && selectedAccountId) {
      fetchHotKeywords()
    }
  }, [dataSource.hotWords, selectedAccountId])

  const fetchHotKeywords = async () => {
    setHotKeywordsLoading(true)
    try {
      const res = await api.get(`/hot-keywords?accountId=${selectedAccountId}`)
      if (res.data.success) {
        setHotKeywords(res.data.data.keywords)
      }
    } catch (error) {
      console.error('Fetch hot keywords error:', error)
    } finally {
      setHotKeywordsLoading(false)
    }
  }

  // Step 2 状态
  const [writingRequirements, setWritingRequirements] = useState('')

  // Step 3 状态
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

  const selectedAccount = getSelectedAccount()

  // 调用工作流 API 生成选题（内联展示）
  const handleGenerateTopics = async () => {
    if (!selectedAccount) {
      alert('请先选择账号')
      return
    }

    setAiLoading(true)
    setWorkflowError(null)
    setStepLogs([])
    try {
      const res = await api.post('/workflow', {
        account: {
          id: selectedAccount.id,
          name: selectedAccount.name,
          position: selectedAccount.position,
          audience: selectedAccount.audience,
          description: selectedAccount.description,
        },
        searchEnabled: dataSource.webSearch,
        hotKeywords: dataSource.hotWords ? hotKeywords : [],
        currentStep: 'topic_generation'
      })

      setStepLogs(res.data.data?.stepLogs || [])

      if (res.data.success && res.data.data?.topics?.length > 0) {
        setGeneratedTopics(res.data.data.topics)
        setSelectedTopic(null)
      } else {
        const errorMsg = res.data.error || '选题生成失败'
        setWorkflowError(errorMsg)
      }
    } catch (error: any) {
      console.error('Workflow error:', error)
      const errorMsg = error.response?.data?.error || '选题生成失败'
      setWorkflowError(errorMsg)
      setStepLogs([])
    } finally {
      setAiLoading(false)
    }
  }


  // 手动输入标题后生成文案
  const handleGenerateContentWithTitle = async () => {
    if (!selectedAccount || !title.trim()) {
      alert('请输入标题或选择选题')
      return
    }

    setAiLoading(true)
    setWorkflowError(null)
    setStepLogs([])

    try {
      const res = await api.post('/workflow', {
        account: {
          id: selectedAccount.id,
          name: selectedAccount.name,
          position: selectedAccount.position,
          audience: selectedAccount.audience,
          description: selectedAccount.description,
        },
        selectedTopic: title,
        searchEnabled: dataSource.webSearch,
        hotWordsEnabled: dataSource.hotWords,
        userRequirements: writingRequirements,
        currentStep: 'content_generation'
      })

      setStepLogs(res.data.data?.stepLogs || [])

      if (res.data.success && res.data.data) {
        const { rawContent: raw, humanizedContent: humanized, sensitiveResult } = res.data.data

        if (raw) {
          setRawContent(raw)
        }

        if (humanized) {
          setHumanizedContent(humanized)
        }

        if (sensitiveResult) {
          setSensitivePassed(!!sensitiveResult.passed)
          setSensitiveWords(sensitiveResult.illegalWords || [])
        }

        setShowContentModal(true)
      } else {
        const errorMsg = res.data.error || '文案生成失败'
        setWorkflowError(errorMsg)
      }
    } catch (error: any) {
      console.error('Workflow error:', error)
      const errorMsg = error.response?.data?.error || '文案生成失败'
      setWorkflowError(errorMsg)
      setStepLogs([])
    } finally {
      setAiLoading(false)
    }
  }

  // 立即发布
  const handlePublish = async () => {
    if (!selectedAccount || !title) {
      alert('请选择账号并输入标题')
      return
    }

    setSaving(true)
    try {
      const res = await api.post('/notes', {
        accountId: selectedAccount.id,
        title,
        content,
        images,
        status: 'published',
        publishedAt: new Date().toISOString(),
      })

      if (res.data.success) {
        alert('发布成功')
        router.push('/drafts')
      }
    } catch (error) {
      console.error('Publish error:', error)
      alert('发布失败')
    } finally {
      setSaving(false)
    }
  }

  // 定时发布
  const handleScheduledPublish = async () => {
    if (!selectedAccount || !title) {
      alert('请选择账号并输入标题')
      return
    }

    if (!schedule.time) {
      alert('请设置发布时间')
      return
    }

    setSaving(true)
    try {
      const res = await api.post('/notes', {
        accountId: selectedAccount.id,
        title,
        content,
        images,
        status: 'pending',
        publishAt: schedule.time.toISOString(),
      })

      if (res.data.success) {
        alert('定时发布已设置')
        router.push('/drafts')
      }
    } catch (error) {
      console.error('Schedule publish error:', error)
      alert('设置失败')
    } finally {
      setSaving(false)
    }
  }

  const applyContent = () => {
    setContent(humanizedContent)
    setShowContentModal(false)
    setHumanizedContent('')
    setRawContent('')
    setSensitiveWords([])
    setSensitivePassed(true)
  }

  const handleAIGenerateImagePrompt = async () => {
    if (!humanizedContent && !content) {
      alert('请先生成文案')
      return
    }

    setAiLoading(true)
    try {
      const res = await api.post('/workflow/image-prompt', {
        content: humanizedContent || content
      })

      if (res.data.success && res.data.data?.imagePrompt) {
        setGeneratedImagePrompt(res.data.data.imagePrompt)
      } else {
        alert(res.data.error || '配图提示词生成失败')
      }
    } catch (error: any) {
      console.error('Image prompt error:', error)
      alert('配图提示词生成失败')
    } finally {
      setAiLoading(false)
    }
  }

  // 生成配图（调用新的配图工作流）
  const handleGenerateImage = async () => {
    if (!humanizedContent && !content) {
      alert('请先生成文案')
      return
    }

    setImageGenerating(true)
    setWorkflowError(null)

    try {
      const fullContent = `标题：${title}\n正文：${humanizedContent || content}\n标签：[]`
      const confirmedPrompt = promptConfirmed ? (imagePrompt || generatedImagePrompt) : undefined

      const res = await api.post('/workflow/image', {
        content: fullContent,
        title,
        imageType,
        imageModel,
        imagePrompt: confirmedPrompt // 传递已确认的提示词
      })

      if (res.data.success && res.data.data) {
        const { imagePrompt, generatedImageUrl, htmlScreenshotUrl, error } = res.data.data

        if (imagePrompt) {
          setGeneratedImagePrompt(imagePrompt)
        }

        const finalImageUrl = generatedImageUrl || htmlScreenshotUrl
        if (finalImageUrl) {
          setGeneratedImageUrl(finalImageUrl)
          // 保存到 images 数组
          setImages([finalImageUrl])
        } else if (error) {
          setWorkflowError(error)
          alert(`配图生成失败：${error}`)
        }
      } else {
        const errorMsg = res.data.error || '配图生成失败'
        setWorkflowError(errorMsg)
        alert(errorMsg)
      }
    } catch (error: any) {
      console.error('Image generation error:', error)
      const errorMsg = error.response?.data?.error || '配图生成失败'
      setWorkflowError(errorMsg)
      alert(errorMsg)
    } finally {
      setImageGenerating(false)
    }
  }

  // 根据反馈重新生成文案
  const handleRegenerateWithFeedback = async () => {
    if (!userFeedback.trim()) {
      alert('请输入修改意见')
      return
    }

    if (!selectedAccount) return

    setAiLoading(true)
    try {
      const res = await api.post('/workflow', {
        account: {
          id: selectedAccount.id,
          name: selectedAccount.name,
          position: selectedAccount.position,
          audience: selectedAccount.audience,
          description: selectedAccount.description,
        },
        selectedTopic: title,
        searchEnabled: false,
        userFeedback,
        rawContent,
        currentStep: 'content_generation'
      })

      if (res.data.success && res.data.data) {
        const { rawContent: raw, humanizedContent: humanized, sensitiveResult } = res.data.data

        if (raw) {
          setRawContent(raw)
        }

        if (humanized) {
          setHumanizedContent(humanized)
        }

        if (sensitiveResult) {
          setSensitivePassed(!!sensitiveResult.passed)
          setSensitiveWords(sensitiveResult.illegalWords || [])
        }

        setUserFeedback('')
      } else {
        alert(res.data.error || '重新生成失败')
      }
    } catch (error: any) {
      console.error('Regenerate error:', error)
      alert('重新生成失败')
    } finally {
      setAiLoading(false)
    }
  }

  const canNext = currentStep === 0 ? title : currentStep === 1 ? content : true

  // 复制文本
  const copyText = async (text: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setToast({ show: true, message: '已复制到剪贴板', type: 'success' })
    } else {
      setToast({ show: true, message: '复制失败，请重试', type: 'error' })
    }
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000)
  }

  return (
    <>
      <Header
        title="创作新笔记"
        rightContent={
          <Select value={selectedAccountId || ''} onValueChange={(v) => selectAccount(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择账号" />
            </SelectTrigger>
            <SelectContent>
              {accounts.length === 0 ? (
                <SelectItem value="no-account" disabled>
                  暂无账号
                </SelectItem>
              ) : (
                accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        }
      />

      <div className="p-6">
        {/* Steps */}
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="flex">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`
                  flex-1 py-3.5 text-sm text-center font-medium transition-colors
                  ${index === currentStep ? 'text-primary border-b-2 border-primary bg-primary-bg' :
                    index < currentStep ? 'text-green-600' : 'text-gray-400'}
                `}
              >
                <span className="mr-1.5">{index + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardBody className="min-h-96">
            {currentStep === 0 && (
              <div className="space-y-6">
                {/* 数据源选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-3">数据源（可多选）</label>
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

                {/* 热点词展示 */}
                {dataSource.hotWords && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-orange-700">🔥 基于"{selectedAccount?.position} · {selectedAccount?.audience}"的热点词</span>
                      {hotKeywordsLoading && <span className="text-xs text-orange-500">加载中...</span>}
                    </div>
                    {hotKeywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {hotKeywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-white border border-orange-200 rounded-full text-sm text-gray-700"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : !hotKeywordsLoading && selectedAccountId ? (
                      <p className="text-sm text-gray-500">暂无可用热点词</p>
                    ) : (
                      <p className="text-sm text-gray-500">请先选择账号以获取热点词</p>
                    )}
                  </div>
                )}

                {/* AI 生成选题按钮 */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">✨ AI 智能选题</span>
                    {aiLoading && <span className="text-xs text-primary">生成中...</span>}
                  </div>
                  {!selectedAccount && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-700">
                      ⚠️ 请先在右上角选择一个小红书账号，才能使用 AI 生成功能
                    </div>
                  )}
                  <Button
                    onClick={handleGenerateTopics}
                    disabled={aiLoading || !selectedAccount}
                    className="w-full"
                  >
                    {aiLoading ? '生成中...' : '🎯 AI 生成选题'}
                  </Button>
                  {workflowError && (
                    <p className="text-red-500 text-xs mt-2">{workflowError}</p>
                  )}
                  {aiLoading && (
                    <div className="mt-3 space-y-1 animate-pulse">
                      <StepLogSkeleton />
                    </div>
                  )}
                  {stepLogs.length > 0 && !aiLoading && (
                    <StepLogDisplay logs={stepLogs} />
                  )}
                </div>

                {/* AI 选题结果展示（内联，无二级弹窗） */}
                {generatedTopics.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-3">AI 推荐选题（点击选题自动填入下方）</label>
                    <div className="space-y-3">
                      {generatedTopics.map((topic, index) => (
                        <button
                          key={index}
                          type="button"
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
                  </div>
                )}

                {/* 笔记标题（最下方） */}
                <div className="border-t pt-4">
                  <Input
                    label="笔记标题"
                    placeholder="输入标题，或点击上方 AI 选题..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{title.length}/100</p>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                {!selectedAccount && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                    ⚠️ 请先在右上角选择一个小红书账号，才能使用 AI 生成功能
                  </div>
                )}

                {/* 笔记标题（来自第一步） */}
                <div className="bg-primary-bg border border-primary/20 rounded-xl p-3">
                  <div className="text-xs text-primary/70 font-medium mb-1">📌 笔记标题</div>
                  <div className="font-medium text-gray-800">{title || '（暂未设置标题）'}</div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">笔记内容</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateContentWithTitle}
                      disabled={aiLoading || !selectedAccount || !title.trim()}
                    >
                      {aiLoading ? '生成中...' : '✨ AI 生成内容'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-orange-500"
                      onClick={() => setShowRegenerateModal(true)}
                    >
                      🔄 重新生成
                    </Button>
                  </div>
                </div>
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
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">配图生成</h3>
                </div>

                {/* 配图类型选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">配图类型</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setImageType('ai_prompt'); setPromptConfirmed(false); }}
                      className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
                        imageType === 'ai_prompt'
                          ? 'border-primary bg-primary-bg text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">🎨</div>
                      <div className="font-medium text-sm">AI 绘图</div>
                      <div className="text-xs text-gray-500">GPT-Image / Seedream</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setImageType('html_screenshot'); setPromptConfirmed(false); }}
                      className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
                        imageType === 'html_screenshot'
                          ? 'border-primary bg-primary-bg text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">📱</div>
                      <div className="font-medium text-sm">HTML 截图</div>
                      <div className="text-xs text-gray-500">小红书风格卡片</div>
                    </button>
                  </div>
                </div>

                {/* AI 绘图选项 */}
                {imageType === 'ai_prompt' && !promptConfirmed && (
                  <div className="space-y-4">
                    {/* 步骤1：先生成提示词 */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">📝 笔记文案预览</div>
                      <div className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">
                        {humanizedContent || content || '暂无文案，请先在"文案"步骤生成内容'}
                      </div>
                    </div>

                    {!generatedImagePrompt && !imagePrompt && (
                      <Button
                        onClick={handleAIGenerateImagePrompt}
                        disabled={aiLoading || (!humanizedContent && !content)}
                        className="w-full"
                      >
                        {aiLoading ? '生成中...' : '💡 生成绘图提示词'}
                      </Button>
                    )}

                    {/* 提示词编辑 + 模型选择 + 生图数量 */}
                    {(generatedImagePrompt || imagePrompt) && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1.5">
                            ✏️ 提示词编辑（可修改）
                          </label>
                          <textarea
                            className="w-full h-24 p-3 border border-gray-200 rounded-xl outline-none focus:border-primary resize-none text-sm"
                            placeholder="AI 生成的绘图提示词..."
                            value={imagePrompt || generatedImagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                          />
                        </div>

                        <label className="block text-sm font-medium text-gray-500 mb-2">绘图模型</label>
                        <Select value={imageModel} onValueChange={(v: any) => setImageModel(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-image-2">GPT-Image 2（默认）</SelectItem>
                            <SelectItem value="doubao-seedream-5-0-lite">Seedream 5.0</SelectItem>
                            <SelectItem value="minimax-image-01">MiniMax Image-01</SelectItem>
                          </SelectContent>
                        </Select>

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

                        <Button
                          onClick={handleGenerateImage}
                          disabled={imageGenerating}
                          className="w-full"
                        >
                          {imageGenerating ? '生成中...' : '✨ 生成图片'}
                        </Button>

                        {/* 跳过配图选项 */}
                        {!generatedImageUrl && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setImages([])
                              setCurrentStep(3)
                            }}
                            className="w-full mt-2 text-gray-400"
                          >
                            跳过配图
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* HTML 截图选项 */}
                {imageType === 'html_screenshot' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-500 mb-1.5">选择风格</label>
                      <Select value={htmlStyle} onValueChange={(v: any) => setHtmlStyle(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="magazine">杂志风</SelectItem>
                          <SelectItem value="cream">奶油风</SelectItem>
                          <SelectItem value="forest">森林风</SelectItem>
                          <SelectItem value="minimal">简约风</SelectItem>
                          <SelectItem value="dopamine">多巴胺风</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-500 mb-1.5">
                        输入内容（万字以内）
                      </label>
                      <textarea
                        className="w-full h-32 p-3 border border-gray-200 rounded-xl outline-none focus:border-primary resize-none text-sm"
                        placeholder="输入你想要生成图片的内容..."
                        value={content}
                        onChange={(e) => setContent(e.target.value.slice(0, 10000))}
                      />
                      <p className="text-xs text-gray-400 mt-1">{content.length}/10000</p>
                    </div>

                    <Button
                      onClick={handleGenerateImage}
                      disabled={imageGenerating || !content.trim()}
                      className="w-full"
                    >
                      {imageGenerating ? '生成中...' : '✨ 生成图片'}
                    </Button>

                    {/* 跳过配图选项 */}
                    {!generatedImageUrl && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setImages([])
                          setCurrentStep(3)
                        }}
                        className="w-full mt-2 text-gray-400"
                      >
                        跳过配图
                      </Button>
                    )}
                  </div>
                )}

                {/* 图片预览网格 */}
                {generatedImages.length > 0 && (
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
                )}

                {workflowError && (
                  <p className="text-red-500 text-sm">{workflowError}</p>
                )}
                {stepLogs.length > 0 && !aiLoading && (
                  <StepLogDisplay logs={stepLogs} />
                )}

                {/* 生成的图片预览 */}
                {generatedImageUrl && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-500">生成结果</label>
                      <Button variant="outline" size="sm" onClick={() => copyText(generatedImageUrl)}>
                        📋 复制图片链接
                      </Button>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-2 bg-gray-50">
                      <img
                        src={generatedImageUrl}
                        alt="生成的配图"
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      {imageType === 'ai_prompt' ? 'AI 绘画' : 'HTML 截图'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium text-center mb-6">📝 发布确认</h3>

                {/* 笔记标题 */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">笔记标题</div>
                      <div className="font-medium">{title || '-'}</div>
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
                      <div className="whitespace-pre-wrap">{content || '-'}</div>
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

                {generatedImageUrl && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">配图</div>
                      <Button variant="outline" size="sm" onClick={() => copyText(generatedImageUrl)}>
                        📋 复制图片链接
                      </Button>
                    </div>
                    <div className="flex justify-center">
                      <img
                        src={generatedImageUrl}
                        alt="配图"
                        className="max-w-full max-h-64 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {images.length === 0 && !generatedImageUrl && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400">
                    无配图
                  </div>
                )}

                {imagePrompt && !generatedImageUrl && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="font-medium mb-2">配图提示词</div>
                    <div className="text-gray-700 text-sm">{imagePrompt}</div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            上一步
          </Button>

          {currentStep < 3 ? (
            <Button
              className="flex-1"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canNext}
            >
              下一步
            </Button>
          ) : (
            <>
              <Button onClick={handlePublish} disabled={saving}>
                立即发布
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setShowScheduleModal(true)}
              >
                ⏰ 定时发布
              </Button>
            </>
          )}
        </div>
      </div>


      {/* AI 文案 Modal */}
      <Modal open={showContentModal} onOpenChange={setShowContentModal}>
        <ModalContent>
          <ModalHeader>
            <h3>✨ AI 生成内容</h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* 敏感词检测结果 */}
              <div className={`rounded-xl p-3 border ${
                sensitivePassed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {sensitivePassed ? (
                    <>
                      <span className="text-green-600 font-medium">✅ 敏感词检测通过</span>
                      <span className="text-xs text-green-500">未检测到敏感词</span>
                    </>
                  ) : (
                    <span className="text-red-600 font-medium">⚠️ 检测到敏感词</span>
                  )}
                </div>
                {!sensitivePassed && sensitiveWords.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sensitiveWords.map((item, index) => (
                        <span key={index} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
                          {item.word}
                        </span>
                      ))}
                    </div>
                    <p className="text-red-500 text-xs mt-2">请修改这些词语后再使用</p>
                  </>
                )}
              </div>

              {/* 原始文案 */}
              {rawContent && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">📝 原始生成</p>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs text-gray-500 font-sans">{rawContent}</pre>
                  </div>
                </div>
              )}

              {/* 润色后文案 */}
              {humanizedContent && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">✨ 去AI味润色后</p>
                  <div className="bg-green-50 rounded-lg p-3 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{humanizedContent}</pre>
                  </div>
                </div>
              )}

              {/* 用户反馈输入 */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">💬 修改意见（可选）</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary resize-none"
                  rows={2}
                  placeholder="输入修改意见，AI 将根据您的反馈调整文案..."
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowContentModal(false)}>
              取消
            </Button>
            <Button
              variant="outline"
              onClick={handleRegenerateWithFeedback}
              disabled={aiLoading || !userFeedback.trim()}
            >
              {aiLoading ? '重新生成中...' : '根据反馈重新生成'}
            </Button>
            <Button onClick={applyContent} disabled={sensitiveWords.length > 0}>
              使用这段内容
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 定时发布 Modal */}
      <ScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        onSchedule={async (scheduleData) => {
          setSchedule({
            enabled: true,
            time: scheduleData.time,
            emailReminder: scheduleData.emailReminder,
            email: scheduleData.email
          })

          // 保存到待发布列表
          if (!selectedAccount || !title) {
            alert('请选择账号并输入标题')
            return
          }

          setSaving(true)
          try {
            const res = await api.post('/notes', {
              accountId: selectedAccount.id,
              title,
              content,
              images,
              status: 'pending',
              publishAt: scheduleData.time.toISOString(),
            })

            if (res.data.success) {
              setShowScheduleModal(false)
              alert('定时发布已设置')
              router.push('/drafts')
            }
          } catch (error) {
            console.error('Schedule publish error:', error)
            alert('设置失败')
          } finally {
            setSaving(false)
          }
        }}
        defaultEmail={schedule.email}
      />

      {/* 重新生成 Modal */}
      <RegenerateModal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        onRegenerate={(feedback) => {
          setUserFeedback(feedback)
          handleRegenerateWithFeedback()
        }}
      />

      {/* Toast 提示 */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}
    </>
  )
}

// 步骤日志骨架屏
function StepLogSkeleton() {
  return (
    <div className="space-y-1.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
        </div>
      ))}
    </div>
  )
}

// 步骤日志展示组件
function StepLogDisplay({ logs }: { logs: StepLog[] }) {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'skipped': return '⏭️'
      default: return '⏳'
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-500'
      case 'skipped': return 'text-gray-400'
      default: return 'text-blue-500'
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
      <div className="text-xs font-medium text-gray-500 mb-2">⚙️ 执行记录</div>
      {logs.map((log, index) => (
        <div key={index} className={`flex items-start gap-2 text-xs ${statusColor(log.status)}`}>
          <span className="mt-0.5">{statusIcon(log.status)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium">{log.step}</span>
              <span className="text-gray-400">·</span>
              <span>{log.message}</span>
            </div>
            {log.durationMs != null && (
              <div className="text-gray-400 mt-0.5">耗时: {log.durationMs}ms</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}