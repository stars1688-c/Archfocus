// src/components/modals/RegenerateModal.tsx

'use client'

import { useState } from 'react'
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
