// src/app/(dashboard)/create/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccountStore } from '@/stores/account-store'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import api from '@/lib/api'
import type { Topic } from '@/lib/ai/types'

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
  const { accounts, selectedAccountId, selectAccount, getSelectedAccount } = useAccountStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // AI states
  const [aiLoading, setAiLoading] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)
  const [generatedTopics, setGeneratedTopics] = useState<Topic[]>([])
  const [rawContent, setRawContent] = useState('')
  const [humanizedContent, setHumanizedContent] = useState('')
  const [sensitiveWords, setSensitiveWords] = useState<{ word: string; type: string }[]>([])
  const [showImagePromptModal, setShowImagePromptModal] = useState(false)
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState('')
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [userFeedback, setUserFeedback] = useState('')

  // Image generation states
  const [imageType, setImageType] = useState<'ai_prompt' | 'html_screenshot'>('ai_prompt')
  const [imageModel, setImageModel] = useState<'gpt-image-2' | 'doubao-seedream-5-0-lite'>('gpt-image-2')
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [imageGenerating, setImageGenerating] = useState(false)

  // Step 1 状态
  const [dataSource, setDataSource] = useState<DataSource>({
    webSearch: true,
    hotWords: false
  })
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

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

  // 调用工作流 API 生成选题
  const handleGenerateTopics = async () => {
    if (!selectedAccount) {
      alert('请先选择账号')
      return
    }

    setAiLoading(true)
    setWorkflowError(null)
    try {
      const res = await api.post('/workflow', {
        account: {
          id: selectedAccount.id,
          name: selectedAccount.name,
          position: selectedAccount.position,
          audience: selectedAccount.audience,
          description: selectedAccount.description,
        },
        searchEnabled: true,
        currentStep: 'topic_generation'
      })

      if (res.data.success && res.data.data?.topics?.length > 0) {
        setGeneratedTopics(res.data.data.topics)
        setShowTopicModal(true)
      } else {
        const errorMsg = res.data.error || '选题生成失败'
        setWorkflowError(errorMsg)
        alert(errorMsg)
      }
    } catch (error: any) {
      console.error('Workflow error:', error)
      const errorMsg = error.response?.data?.error || '选题生成失败'
      setWorkflowError(errorMsg)
      alert(errorMsg)
    } finally {
      setAiLoading(false)
    }
  }

  // 选择选题后继续工作流生成文案
  const handleSelectTopic = async (topic: Topic) => {
    if (!selectedAccount) return

    setTitle(topic.title)
    setShowTopicModal(false)
    setAiLoading(true)
    setWorkflowError(null)

    try {
      const res = await api.post('/workflow', {
        account: {
          id: selectedAccount.id,
          name: selectedAccount.name,
          position: selectedAccount.position,
          audience: selectedAccount.audience,
          description: selectedAccount.description,
        },
        selectedTopic: topic.title,
        searchEnabled: true,
        currentStep: 'content_generation'
      })

      if (res.data.success && res.data.data) {
        const { rawContent: raw, humanizedContent: humanized, sensitiveResult } = res.data.data

        if (raw) {
          // 解析原始文案获取标题
          const titleMatch = raw.match(/标题：(.+)/)
          const contentMatch = raw.match(/正文：([\s\S]+?)(?:标签：|$)/)
          const tagsMatch = raw.match(/标签：\[(.+)\]/)

          if (titleMatch && !title) setTitle(titleMatch[1].trim())
          setRawContent(contentMatch?.[1]?.trim() || '')
        }

        if (humanized) {
          setHumanizedContent(humanized)
        }

        if (sensitiveResult) {
          if (!sensitiveResult.passed && sensitiveResult.illegalWords?.length) {
            setSensitiveWords(sensitiveResult.illegalWords)
            const words = sensitiveResult.illegalWords.map((w: any) => w.word).join('、')
            alert(`⚠️ 检测到敏感词：${words}\n请修改后再使用！`)
          } else {
            setSensitiveWords([])
          }
        }

        setShowContentModal(true)
      } else {
        const errorMsg = res.data.error || '文案生成失败'
        setWorkflowError(errorMsg)
        alert(errorMsg)
      }
    } catch (error: any) {
      console.error('Workflow error:', error)
      const errorMsg = error.response?.data?.error || '文案生成失败'
      setWorkflowError(errorMsg)
      alert(errorMsg)
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
        searchEnabled: true,
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
          if (!sensitiveResult.passed && sensitiveResult.illegalWords?.length) {
            setSensitiveWords(sensitiveResult.illegalWords)
          } else {
            setSensitiveWords([])
          }
        }

        setShowContentModal(true)
      } else {
        const errorMsg = res.data.error || '文案生成失败'
        setWorkflowError(errorMsg)
        alert(errorMsg)
      }
    } catch (error: any) {
      console.error('Workflow error:', error)
      const errorMsg = error.response?.data?.error || '文案生成失败'
      setWorkflowError(errorMsg)
      alert(errorMsg)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveDraft = async () => {
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
      })

      if (res.data.success) {
        alert('草稿保存成功')
        router.push('/drafts')
      }
    } catch (error) {
      console.error('Save draft error:', error)
      alert('保存失败')
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
        setShowImagePromptModal(true)
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

      const res = await api.post('/workflow/image', {
        content: fullContent,
        title,
        imageType,
        imageModel
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
          if (!sensitiveResult.passed && sensitiveResult.illegalWords?.length) {
            setSensitiveWords(sensitiveResult.illegalWords)
          } else {
            setSensitiveWords([])
          }
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

  return (
    <>
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
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">💡</div>
                  <h3 className="text-lg font-medium">开始创作</h3>
                  <p className="text-gray-500 text-sm">输入笔记主题或使用 AI 生成选题</p>
                </div>
                <Input
                  label="笔记标题"
                  placeholder="输入标题..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="text-xs text-gray-400 text-right">{title.length}/100</p>

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

                {/* AI 生成选题 */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">✨ AI 智能选题</span>
                    {aiLoading && <span className="text-xs text-primary">生成中...</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleGenerateTopics}
                      disabled={aiLoading || !selectedAccount}
                      className="flex-1"
                    >
                      {aiLoading ? '生成中...' : '🎯 AI 生成选题'}
                    </Button>
                    <Button
                      onClick={handleGenerateContentWithTitle}
                      disabled={aiLoading || !selectedAccount || !title.trim()}
                    >
                      直接生成文案
                    </Button>
                  </div>
                  {workflowError && (
                    <p className="text-red-500 text-xs mt-2">{workflowError}</p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">笔记内容</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateContentWithTitle}
                    disabled={aiLoading || !selectedAccount || !title.trim()}
                  >
                    {aiLoading ? '生成中...' : '✨ AI 生成内容'}
                  </Button>
                </div>
                <textarea
                  className="w-full h-64 p-4 border border-gray-200 rounded-xl outline-none focus:border-primary resize-none"
                  placeholder="输入笔记内容..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <p className="text-xs text-gray-400 text-right">{content.length}/1000</p>
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
                      onClick={() => setImageType('ai_prompt')}
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
                      onClick={() => setImageType('html_screenshot')}
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
                {imageType === 'ai_prompt' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">绘图模型</label>
                    <Select value={imageModel} onValueChange={(v: any) => setImageModel(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-image-2">GPT-Image 2</SelectItem>
                        <SelectItem value="doubao-seedream-5-0-lite">Seedream 5.0</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 提示词显示 */}
                {(generatedImagePrompt || imagePrompt) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      AI 绘图提示词
                    </label>
                    <textarea
                      className="w-full h-24 p-3 border border-gray-200 rounded-xl outline-none focus:border-primary resize-none text-sm"
                      placeholder="AI 生成的绘图提示词..."
                      value={imagePrompt || generatedImagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                    />
                  </div>
                )}

                {/* 生成按钮 */}
                <Button
                  onClick={handleGenerateImage}
                  disabled={imageGenerating || (!humanizedContent && !content)}
                  className="w-full"
                >
                  {imageGenerating ? '生成中...' : '✨ 生成配图'}
                </Button>

                {workflowError && (
                  <p className="text-red-500 text-sm">{workflowError}</p>
                )}

                {/* 生成的图片预览 */}
                {generatedImageUrl && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">生成结果</label>
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
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="font-medium mb-2">标题</div>
                  <div className="text-gray-700">{title || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="font-medium mb-2">内容</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{content || '-'}</div>
                </div>
                {generatedImageUrl && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="font-medium mb-2">配图</div>
                    <div className="flex justify-center">
                      <img
                        src={generatedImageUrl}
                        alt="配图"
                        className="max-w-full max-h-64 rounded-lg"
                      />
                    </div>
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
              <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                保存草稿
              </Button>
              <Button onClick={handleSaveDraft} disabled={saving}>
                立即发布
              </Button>
            </>
          )}
        </div>
      </div>

      {/* AI 选题 Modal */}
      <Modal open={showTopicModal} onOpenChange={setShowTopicModal}>
        <ModalContent>
          <ModalHeader>
            <h3>🎯 AI 推荐选题</h3>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-500 mb-4">基于你的人设和当前热点，AI 生成了以下选题：</p>
            <div className="space-y-3">
              {generatedTopics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectTopic(topic)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-bg transition-colors"
                >
                  <div className="font-medium text-primary mb-1">{topic.title}</div>
                  <div className="text-xs text-gray-500">{topic.reason}</div>
                </button>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowTopicModal(false)}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* AI 文案 Modal */}
      <Modal open={showContentModal} onOpenChange={setShowContentModal}>
        <ModalContent>
          <ModalHeader>
            <h3>✨ AI 生成内容</h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* 敏感词警告 */}
              {sensitiveWords.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm font-medium mb-2">⚠️ 检测到敏感词：</p>
                  <div className="flex flex-wrap gap-2">
                    {sensitiveWords.map((item, index) => (
                      <span key={index} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
                        {item.word}
                      </span>
                    ))}
                  </div>
                  <p className="text-red-500 text-xs mt-2">请修改这些词语后再使用</p>
                </div>
              )}

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

      {/* AI Image Prompt Modal */}
      <Modal open={showImagePromptModal} onOpenChange={setShowImagePromptModal}>
        <ModalContent>
          <ModalHeader>
            <h3>✨ AI 生成绘图提示词</h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">英文提示词（用于 AI 绘图）：</p>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{generatedImagePrompt}</pre>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowImagePromptModal(false)}>
              取消
            </Button>
            <Button onClick={() => {
              setImagePrompt(generatedImagePrompt)
              setShowImagePromptModal(false)
            }}>
              使用此提示词
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
