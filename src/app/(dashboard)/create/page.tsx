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
import api from '@/lib/api'

const STEPS = ['选题', '文案', '配图', '发布']

export default function CreatePage() {
  const router = useRouter()
  const { accounts, selectedAccountId, selectAccount, getSelectedAccount } = useAccountStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const selectedAccount = getSelectedAccount()

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

  const canNext = currentStep === 0 ? title : currentStep === 1 ? content : true

  return (
    <>
      <Header
        title="创作新笔记"
        rightContent={
          <Select value={selectedAccountId || ''} onValueChange={selectAccount}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择账号" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
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
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">💡</div>
                  <h3 className="text-lg font-medium">开始创作</h3>
                  <p className="text-gray-500 text-sm">输入笔记主题或标题</p>
                </div>
                <Input
                  label="笔记标题"
                  placeholder="输入标题..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="text-xs text-gray-400 text-right">{title.length}/100</p>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">笔记内容</h3>
                  <span className="text-xs text-gray-400">可直接点击内容进行修改</span>
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
              <div className="text-center py-16">
                <div className="text-4xl mb-3">🎨</div>
                <h3 className="text-lg font-medium mb-2">配图功能</h3>
                <p className="text-gray-500 text-sm mb-6">Phase 2 将支持 AI 生成配图</p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 max-w-sm mx-auto">
                  <p className="text-gray-400 text-sm">暂时支持手动上传</p>
                </div>
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
    </>
  )
}