// src/components/modals/SyncModal.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useAccountStore } from '@/stores/account-store'
import api from '@/lib/api'

interface SyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSynced?: () => void
}

export function SyncModal({ open, onOpenChange, onSynced }: SyncModalProps) {
  const { accounts, setAccounts, selectedAccountId, selectAccount } = useAccountStore()
  const [accountList, setAccountList] = useState(accounts)
  const [intervalDays, setIntervalDays] = useState(1)
  const [syncTime, setSyncTime] = useState('02:00')
  const [syncing, setSyncing] = useState(false)
  const [syncAccount, setSyncAccount] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  // 倒计时
  const [countdown, setCountdown] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open) {
      loadConfig()
      loadAccounts()
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [open])

  useEffect(() => {
    if (open) startCountdown()
  }, [open, intervalDays, syncTime])

  const loadConfig = async () => {
    try {
      const res = await api.get('/sync')
      if (res.data.success && res.data.data) {
        setIntervalDays(res.data.data.intervalDays || 1)
        setSyncTime(res.data.data.syncTime || '02:00')
      }
    } catch (error) {
      console.error('Load sync config error:', error)
    }
  }

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts')
      if (res.data.success) {
        setAccountList(res.data.data)
        setAccounts(res.data.data)
      }
    } catch (error) {
      console.error('Load accounts error:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.put('/sync', { intervalDays, syncTime })
      startCountdown()
      alert('✅ 同步设置已保存')
    } catch (error) {
      console.error('Save sync config error:', error)
      alert('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const accountIds = syncAccount === 'all'
        ? accountList.map(a => a.id)
        : [syncAccount]
      const res = await api.post('/sync', { accountIds })
      if (res.data.success) {
        const { stats } = res.data.data
        alert(`✅ 同步完成\n\n关联 ${stats.linked} 篇\n外部新增 ${stats.externalNew} 篇\n待关联 ${stats.pendingLink} 篇`)
        onSynced?.()
        onOpenChange(false)
      } else {
        alert(res.data.error || '同步失败')
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('同步失败，请重试')
    } finally {
      setSyncing(false)
    }
  }

  const startCountdown = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    const update = () => {
      const now = new Date()
      const [hours, minutes] = syncTime.split(':').map(Number)
      const next = new Date()
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) next.setDate(next.getDate() + intervalDays)

      const diff = next.getTime() - now.getTime()
      if (diff <= 0) {
        setCountdown('即将同步')
        return
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown(
        d > 0
          ? `下次同步：${d}天${h}时${m}分${s}秒`
          : `下次同步：${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }

    update()
    intervalRef.current = setInterval(update, 1000)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <h3>🔄 同步笔记数据</h3>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* 数据来源 */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-500 mb-1.5">数据来源</label>
              <select
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none bg-gray-50 text-gray-400 text-sm"
              >
                <option>TikOmni API</option>
              </select>
            </div>

            {/* 同步账号 */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-500 mb-1.5">同步账号</label>
              <select
                value={syncAccount}
                onChange={(e) => setSyncAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-primary text-sm"
              >
                <option value="all">全部账号</option>
                {accountList.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 定时设置 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">固定时间间隔</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={30}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm outline-none focus:border-primary"
                  />
                  <span className="text-sm text-gray-400">天</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">每天同步时间</span>
                <input
                  type="time"
                  value={syncTime}
                  onChange={(e) => setSyncTime(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* 下次同步倒计时 */}
            {countdown && (
              <div className="text-center">
                <span className="text-xs text-gray-400">{countdown}</span>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '确认'}
          </Button>
          <Button
            variant="ghost"
            className="text-primary"
            onClick={handleManualSync}
            disabled={syncing}
          >
            {syncing ? '同步中...' : '🔁 手动同步'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
