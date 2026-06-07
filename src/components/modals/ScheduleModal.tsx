// src/components/modals/ScheduleModal.tsx

'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

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
