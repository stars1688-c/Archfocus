// src/app/(dashboard)/create/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccountStore } from '@/stores/account-store'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { ScheduleModal } from '@/components/modals/ScheduleModal'
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
  const [sensitiveReplacements, setSensitiveReplacements] = useState<Record<string, string>>({})
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState('')
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [stepLogs, setStepLogs] = useState<StepLog[]>([])
  const [userFeedback, setUserFeedback] = useState('')
  const [editorFullscreen, setEditorFullscreen] = useState(false)

  // Image generation states
  const [imageType, setImageType] = useState<'ai_prompt' | 'html_screenshot'>('ai_prompt')
  const [imageModel, setImageModel] = useState<string>('gpt-image-2')
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [imageGenerating, setImageGenerating] = useState(false)
  const [promptConfirmed, setPromptConfirmed] = useState(false) // 提示词是否已确认

  // Loading progress simulation
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState('')

  useEffect(() => {
    if (aiLoading || imageGenerating) {
      setLoadingProgress(0)
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev
          const increment = prev < 70 ? 5 + Math.random() * 8 : 1 + Math.random() * 3
          return Math.min(95, prev + increment)
        })
      }, 400)
      return () => {
        clearInterval(interval)
        setLoadingProgress(100)
        setTimeout(() => setLoadingProgress(0), 600)
      }
    } else {
      setLoadingProgress(0)
    }
  }, [aiLoading, imageGenerating])

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

  const selectedAccount = getSelectedAccount()

  // ===== 自动保存草稿 =====
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)

  // 当前渲染快照 ref（在 render 阶段更新，用于 effect cleanup 中判断账号是否变更）
  const currStateRef = useRef({
    accountId: '', title: '', content: '', rawContent: '', humanizedContent: '',
    imagePrompt: '', imageType: 'ai_prompt' as ImageType, htmlStyle: 'magazine' as HtmlStyle,
    imageModel: '', images: '[]', writingRequirements: '', generatedImagePrompt: '', step: 0,
  })
  currStateRef.current = {
    accountId: selectedAccountId ?? '', title, content, rawContent, humanizedContent,
    imagePrompt, imageType, htmlStyle, imageModel, images: JSON.stringify(images),
    writingRequirements, generatedImagePrompt, step: currentStep,
  }

  // 加载草稿（账号切换时恢复未完成的内容）
  useEffect(() => {
    if (!selectedAccountId) return
    setDraftLoaded(false)

    const loadDraft = async () => {
      try {
        const res = await api.get(`/drafts?accountId=${selectedAccountId}`)
        if (res.data.success && res.data.data) {
          const d = res.data.data
          if (d.title) setTitle(d.title)
          if (d.content) setContent(d.content)
          if (d.rawContent) setRawContent(d.rawContent)
          if (d.humanizedContent) setHumanizedContent(d.humanizedContent)
          if (d.imagePrompt) setImagePrompt(d.imagePrompt)
          if (d.imageType) setImageType(d.imageType)
          if (d.htmlStyle) setHtmlStyle(d.htmlStyle as HtmlStyle)
          if (d.imageModel) setImageModel(d.imageModel)
          if (d.step) setCurrentStep(d.step)
          if (d.images) try { setImages(JSON.parse(d.images)) } catch {}
          if (d.writingRequirements) setWritingRequirements(d.writingRequirements)
          if (d.generatedImagePrompt) setGeneratedImagePrompt(d.generatedImagePrompt)
        }
      } catch (error) {
        console.error('Load draft error:', error)
      } finally {
        setDraftLoaded(true)
      }
    }

    loadDraft()
  }, [selectedAccountId])

  // 自动保存（防抖 2 秒）
  const saveDraft = useCallback(async () => {
    if (!selectedAccountId) return
    try {
      await api.post('/drafts', {
        accountId: selectedAccountId,
        title,
        content,
        rawContent,
        humanizedContent,
        imagePrompt,
        imageType,
        htmlStyle,
        imageModel,
        images: JSON.stringify(images),
        writingRequirements,
        generatedImagePrompt,
        step: currentStep,
      })
    } catch (error) {
      // 静默失败，不干扰用户
    }
  }, [selectedAccountId, title, content, rawContent, humanizedContent, imagePrompt, imageType, htmlStyle, imageModel, images, writingRequirements, generatedImagePrompt, currentStep])

  // 内容变化时自动保存 + 切换账号时立即保存
  useEffect(() => {
    if (!selectedAccountId || !draftLoaded) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(saveDraft, 2000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      // 账号切换时立即保存当前账号的草稿（防抖期内切账号不丢数据）
      // cleanup 闭包捕获的是旧渲染的 selectedAccountId（旧账号）
      // currStateRef 在本次渲染阶段已更新为新的 selectedAccountId（新账号）
      // 两者不同说明发生了账号切换
      if (draftLoaded && selectedAccountId && selectedAccountId !== currStateRef.current.accountId) {
        saveDraft()
      }
    }
  }, [title, content, rawContent, humanizedContent, imagePrompt, imageType, htmlStyle, imageModel, images, writingRequirements, generatedImagePrompt, currentStep, selectedAccountId, draftLoaded, saveDraft])

  // 页面关闭或导航离开时立即保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!selectedAccountId) return
      const payload = JSON.stringify({
        accountId: selectedAccountId,
        title,
        content,
        rawContent,
        humanizedContent,
        imagePrompt,
        imageType,
        htmlStyle,
        imageModel,
        images: JSON.stringify(images),
        writingRequirements,
        generatedImagePrompt,
        step: currentStep,
      })
      navigator.sendBeacon('/api/drafts', new Blob([payload], { type: 'application/json' }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // 组件卸载时立即保存（切模块时触发）
      if (!selectedAccountId || !draftLoaded) return
      saveDraft()
    }
  }, [selectedAccountId, title, content, rawContent, humanizedContent, imagePrompt, imageType, htmlStyle, imageModel, images, writingRequirements, generatedImagePrompt, currentStep, draftLoaded, saveDraft])
  // ===== 自动保存结束 =====

  // 调用工作流 API 生成选题（内联展示）
  const handleGenerateTopics = async () => {
    if (!selectedAccount) {
      alert('请先选择账号')
      return
    }

    setAiLoading(true)
    setLoadingStage(dataSource.webSearch ? '联网搜索中...' : 'AI 生成选题中...')
    setWorkflowError(null)
    setStepLogs([])
    try {
      // 如果启用了联网搜索，先展示联网搜索阶段
      if (dataSource.webSearch) {
        await new Promise(r => setTimeout(r, 500)) // 短暂展示联网搜索阶段
        setLoadingStage('AI 生成选题中...')
      }
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


  // 手动输入标题后生成文案（分步执行，显示真实进度）
  const handleGenerateContentWithTitle = async () => {
    if (!selectedAccount || !title.trim()) {
      alert('请输入标题或选择选题')
      return
    }

    setAiLoading(true)
    setWorkflowError(null)
    setStepLogs([])

    const account = {
      id: selectedAccount.id,
      name: selectedAccount.name,
      position: selectedAccount.position,
      audience: selectedAccount.audience,
      description: selectedAccount.description,
    }

    try {
      // Step 1: 初稿生成
      setLoadingStage('初稿生成中...')
      const step1Res = await api.post('/workflow/step', {
        step: 'content_generation',
        state: {
          account,
          selectedTopic: title,
          userRequirements: writingRequirements,
          searchEnabled: dataSource.webSearch,
        }
      })

      if (!step1Res.data.success) {
        throw new Error(step1Res.data.error || '文案生成失败')
      }

      const raw = step1Res.data.data.rawContent
      if (!raw) throw new Error('未获取到文案内容')

      setRawContent(raw)
      setStepLogs(prev => [...prev, ...(step1Res.data.data.stepLogs || [])])

      // Step 2: 去AI味
      setLoadingStage('去AI味中...')
      const step2Res = await api.post('/workflow/step', {
        step: 'humanization',
        state: { rawContent: raw }
      })

      if (!step2Res.data.success) {
        throw new Error(step2Res.data.error || '润色失败')
      }

      const humanized = step2Res.data.data.humanizedContent
      setHumanizedContent(humanized)
      setStepLogs(prev => [...prev, ...(step2Res.data.data.stepLogs || [])])

      // Step 3: 敏感词检测
      setLoadingStage('敏感词检测中...')
      const step3Res = await api.post('/workflow/step', {
        step: 'sensitive_check',
        state: { humanizedContent: humanized }
      })

      if (!step3Res.data.success) {
        throw new Error(step3Res.data.error || '敏感词检测失败')
      }

      const sensitiveResult = step3Res.data.data.sensitiveResult
      setSensitivePassed(!!sensitiveResult.passed)
      setSensitiveWords(sensitiveResult.illegalWords || [])
      setStepLogs(prev => [...prev, ...(step3Res.data.data.stepLogs || [])])

      // 全部完成，展示内容弹窗
      setShowContentModal(true)
    } catch (error: any) {
      console.error('Workflow error:', error)
      const errorMsg = error.response?.data?.error || error.message || '文案生成失败'
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
        // 发布成功后清除草稿
        api.delete(`/drafts?accountId=${selectedAccount.id}`).catch(() => {})
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
    let finalContent = humanizedContent
    // 替换敏感词
    Object.entries(sensitiveReplacements).forEach(([original, replacement]) => {
      if (replacement.trim()) {
        finalContent = finalContent.replaceAll(original, replacement)
      }
    })
    setContent(finalContent)
    setShowContentModal(false)
    setHumanizedContent('')
    setRawContent('')
    setSensitiveWords([])
    setSensitivePassed(true)
    setSensitiveReplacements({})
  }

  const handleAIGenerateImagePrompt = async () => {
    if (!humanizedContent && !content) {
      alert('请先生成文案')
      return
    }

    setAiLoading(true)
    setLoadingStage('配图提示词生成中...')
    try {
      const res = await api.post('/workflow/image-prompt', {
        title: title,
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
    setLoadingStage(imageType === 'ai_prompt' ? 'AI 绘图生成中...' : 'HTML 截图生成中...')
    setWorkflowError(null)
    setGeneratedImageUrl(null)
    setImages([])

    try {
      const fullContent = `标题：${title}\n正文：${humanizedContent || content}\n标签：[]`
      // 如果有提示词（AI 生成或用户编辑），直接传入工作流，跳过提示词重新生成
      const confirmedPrompt = imagePrompt || generatedImagePrompt || undefined

      const res = await api.post('/workflow/image', {
        content: fullContent,
        title,
        imageType,
        imageModel,
        imagePrompt: confirmedPrompt
      })

      if (res.data.success && res.data.data) {
        const { imagePrompt, generatedImageUrl, htmlScreenshotUrl, htmlScreenshotUrls, error } = res.data.data

        if (imagePrompt) {
          setGeneratedImagePrompt(imagePrompt)
        }

        // HTML 截图多图模式
        if (htmlScreenshotUrls && htmlScreenshotUrls.length > 0) {
          setGeneratedImageUrl(htmlScreenshotUrls[0])
          setImages(htmlScreenshotUrls)
        } else {
          const finalImageUrl = generatedImageUrl || htmlScreenshotUrl
          if (finalImageUrl) {
            setGeneratedImageUrl(finalImageUrl)
            setImages([finalImageUrl])
          } else if (error) {
            setWorkflowError(error)
          }
        }
      } else {
        const errorMsg = res.data.error || '配图生成失败'
        setWorkflowError(errorMsg)
      }
    } catch (error: any) {
      console.error('Image generation error:', error)
      const errorMsg = error.response?.data?.error || '配图生成失败'
      setWorkflowError(errorMsg)
    } finally {
      setImageGenerating(false)
    }
  }

  // 根据反馈重新生成文案（分步执行，显示真实进度，完成后展示内容弹窗）
  const handleRegenerateWithFeedback = async (feedback?: string) => {
    const fb = feedback ?? userFeedback
    if (!fb.trim()) {
      alert('请输入修改意见')
      return
    }

    if (!selectedAccount) return

    setAiLoading(true)
    setWorkflowError(null)

    const account = {
      id: selectedAccount.id,
      name: selectedAccount.name,
      position: selectedAccount.position,
      audience: selectedAccount.audience,
      description: selectedAccount.description,
    }

    try {
      // Step 1: 初稿重新生成
      setLoadingStage('初稿重新生成中...')
      const step1Res = await api.post('/workflow/step', {
        step: 'content_generation',
        state: {
          account,
          selectedTopic: title,
          userFeedback: fb,
          rawContent,
          searchEnabled: false,
        }
      })

      if (!step1Res.data.success) {
        throw new Error(step1Res.data.error || '文案生成失败')
      }

      const raw = step1Res.data.data.rawContent
      if (!raw) throw new Error('未获取到文案内容')

      setRawContent(raw)
      setStepLogs(prev => [...prev, ...(step1Res.data.data.stepLogs || [])])

      // Step 2: 去AI味
      setLoadingStage('去AI味中...')
      const step2Res = await api.post('/workflow/step', {
        step: 'humanization',
        state: { rawContent: raw }
      })

      if (!step2Res.data.success) {
        throw new Error(step2Res.data.error || '润色失败')
      }

      const humanized = step2Res.data.data.humanizedContent
      setHumanizedContent(humanized)
      setStepLogs(prev => [...prev, ...(step2Res.data.data.stepLogs || [])])

      // Step 3: 敏感词检测
      setLoadingStage('敏感词检测中...')
      const step3Res = await api.post('/workflow/step', {
        step: 'sensitive_check',
        state: { humanizedContent: humanized }
      })

      if (!step3Res.data.success) {
        throw new Error(step3Res.data.error || '敏感词检测失败')
      }

      const sensitiveResult = step3Res.data.data.sensitiveResult
      setSensitivePassed(!!sensitiveResult.passed)
      setSensitiveWords(sensitiveResult.illegalWords || [])
      setStepLogs(prev => [...prev, ...(step3Res.data.data.stepLogs || [])])

      setUserFeedback('')
      // 重新生成完成后展示内容弹窗
      setShowContentModal(true)
    } catch (error: any) {
      console.error('Regenerate error:', error)
      const errorMsg = error.response?.data?.error || error.message || '重新生成失败'
      setWorkflowError(errorMsg)
      setStepLogs([])
    } finally {
      setAiLoading(false)
    }
  }

  const canNext = currentStep === 0 ? title : currentStep === 1 ? (content || humanizedContent) : true

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
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-600 text-sm font-medium">❌ 生成失败</p>
                      <p className="text-red-500 text-xs mt-1">{workflowError}</p>
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
                    onChange={(e) => setTitle(e.target.value.slice(0, 20))}
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{title.length}/20</p>
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
                      onClick={() => setShowContentModal(true)}
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
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500">笔记内容（点击可直接修改）</label>
                    <button
                      type="button"
                      onClick={() => setEditorFullscreen(true)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                      title="全屏编辑"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    </button>
                  </div>
                  <div
                    contentEditable
                    className="w-full p-5 bg-gray-50 rounded-xl border-l-4 border-primary outline-none whitespace-pre-wrap leading-relaxed min-h-[200px]"
                    onBlur={(e) => setContent(e.currentTarget.textContent || '')}
                    suppressContentEditableWarning
                  >
                    {humanizedContent || content}
                  </div>
                  <p className={`text-xs text-right mt-1 ${(humanizedContent || content).length > 800 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{(humanizedContent || content).length}/800</p>
                </div>

                {/* 全屏编辑 Modal */}
                <Modal open={editorFullscreen} onOpenChange={setEditorFullscreen}>
                  <ModalContent className="!inset-0 !translate-x-0 !translate-y-0 max-w-none max-h-none h-full w-full flex flex-col !p-0 overflow-hidden !rounded-none">
                    <ModalHeader>
                      <span className="font-medium">编辑笔记内容</span>
                      <button
                        type="button"
                        onClick={() => setEditorFullscreen(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                        title="退出全屏"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </ModalHeader>
                    <ModalBody className="flex-1 flex flex-col min-h-0 px-5 py-4">
                      <div
                        contentEditable
                        className="w-full flex-1 p-5 bg-gray-50 rounded-xl border-l-4 border-primary outline-none whitespace-pre-wrap leading-relaxed overflow-y-auto min-h-0"
                        onBlur={(e) => setContent(e.currentTarget.textContent || '')}
                        suppressContentEditableWarning
                      >
                        {humanizedContent || content}
                      </div>
                      <p className={`text-xs text-right mt-2 ${(humanizedContent || content).length > 800 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{(humanizedContent || content).length}/800</p>
                    </ModalBody>
                    <ModalFooter>
                      <button
                        type="button"
                        onClick={() => setEditorFullscreen(false)}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
                      >
                        完成编辑
                      </button>
                    </ModalFooter>
                  </ModalContent>
                </Modal>
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
                            <SelectItem value="minimax-image-01">MiniMax Image-01</SelectItem>
                            <SelectItem value="doubao-seedream-5-0-lite">Seedream 5.0</SelectItem>
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
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm font-medium">❌ 生成失败</p>
                    <p className="text-red-500 text-xs mt-1">{workflowError}</p>
                  </div>
                )}
                {stepLogs.length > 0 && !aiLoading && (
                  <StepLogDisplay logs={stepLogs} />
                )}

                {/* 生成的图片预览 */}
                {images.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-500">
                        生成结果（{images.length} 张）
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {images.map((url, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-2 bg-gray-50">
                          <img src={url} alt={`截图 ${index + 1}`} className="w-full h-auto rounded-lg" />
                          <p className="text-xs text-gray-400 text-center mt-1">
                            {index === 0 ? '封面' : `第 ${index + 1} 页`}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      {imageType === 'html_screenshot' ? 'HTML 截图' : 'AI 绘画'}
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

                {images.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">配图（{images.length} 张）</div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {images.map((url, index) => (
                        <img key={index} src={url} alt={`配图 ${index + 1}`} className="w-24 h-32 object-cover rounded-lg border border-gray-200" />
                      ))}
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
                    <div className="flex flex-col gap-2 mt-2">
                      {sensitiveWords.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs shrink-0">
                            {item.word}
                          </span>
                          <span className="text-xs text-gray-400">→</span>
                          <input
                            className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:border-primary"
                            placeholder="替换为..."
                            value={sensitiveReplacements[item.word] || ''}
                            onChange={(e) => setSensitiveReplacements(prev => ({ ...prev, [item.word]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-orange-500 text-xs mt-2">💡 可修改敏感词后使用，或直接使用（注意平台审核风险）</p>
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
              onClick={() => handleRegenerateWithFeedback()}
              disabled={aiLoading || !userFeedback.trim()}
            >
              {aiLoading ? '重新生成中...' : '根据反馈重新生成'}
            </Button>
            <Button onClick={applyContent}>
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

      {/* 进度弹窗 - 手机端全屏居中显示 */}
      {(aiLoading || imageGenerating) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full flex flex-col items-center gap-4">
            {/* 旋转动画 */}
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            {/* 百分比 */}
            <div className="text-4xl font-bold text-primary">{Math.round(loadingProgress)}%</div>
            {/* 阶段名称 */}
            <div className="text-sm text-gray-500 text-center">{loadingStage}</div>
            {/* 进度条 */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

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

// 进度弹窗组件 - 手机端全屏显示旋转+百分比+阶段
function LoadingProgress({ progress }: { progress: number }) {
  return (
    <div className="mt-3 bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-700">处理中...</span>
        </div>
        <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
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