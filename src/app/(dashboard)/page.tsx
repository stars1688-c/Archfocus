// src/app/(dashboard)/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccountStore } from '@/stores/account-store'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import type { Account, Note } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { accounts, setAccounts, addAccount, updateAccount, deleteAccount } = useAccountStore()
  const [stats, setStats] = useState({ published: 0, pending: 0 })
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [accountForm, setAccountForm] = useState({
    name: '',
    xiaohongshuId: '',
    email: '',
    phone: '',
    position: '',
    audience: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [accountsRes, notesRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/notes?limit=100'),
      ])

      if (accountsRes.data.success) {
        setAccounts(accountsRes.data.data)
      }

      if (notesRes.data.success) {
        const notes = notesRes.data.data.notes
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const published = notes.filter((n: Note) =>
          n.status === 'published' &&
          new Date(n.publishedAt!) >= monthStart
        ).length

        const pending = notes.filter((n: Note) => n.status === 'pending').length

        setStats({ published, pending })
      }
    } catch (error) {
      console.error('Load data error:', error)
    }
  }

  const handleSaveAccount = async () => {
    try {
      if (editingAccount) {
        const res = await api.put('/accounts', { id: editingAccount.id, ...accountForm })
        if (res.data.success) {
          updateAccount(editingAccount.id, res.data.data)
        }
      } else {
        const res = await api.post('/accounts', accountForm)
        if (res.data.success) {
          addAccount(res.data.data)
        }
      }
      setShowAccountModal(false)
      resetForm()
    } catch (error) {
      console.error('Save account error:', error)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('确定要删除该账号吗？')) return

    try {
      const res = await api.delete(`/accounts?id=${id}`)
      if (res.data.success) {
        deleteAccount(id)
      }
    } catch (error) {
      console.error('Delete account error:', error)
    }
  }

  const resetForm = () => {
    setAccountForm({
      name: '', xiaohongshuId: '', email: '', phone: '',
      position: '', audience: '', description: '',
    })
    setEditingAccount(null)
  }

  const openEditModal = (account: Account) => {
    setEditingAccount(account)
    setAccountForm({
      name: account.name,
      xiaohongshuId: account.xiaohongshuId || '',
      email: account.email || '',
      phone: account.phone || '',
      position: account.position,
      audience: account.audience,
      description: account.description,
    })
    setShowAccountModal(true)
  }

  return (
    <>
      <Header title="工作台" />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardBody>
              <div className="text-sm text-gray-500 mb-1">当月已发布</div>
              <div className="text-3xl font-bold text-primary">{stats.published}</div>
              <div className="text-xs text-gray-400 mt-1">本月已发布笔记数</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-sm text-gray-500 mb-1">当月待发布</div>
              <div className="text-3xl font-bold text-accent-orange">{stats.pending}</div>
              <div className="text-xs text-gray-400 mt-1">待发布 / 待审核</div>
            </CardBody>
          </Card>
        </div>

        {/* Account Management */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">👤 账户管理</span>
              <Button size="sm" onClick={() => setShowAccountModal(true)}>
                + 添加账号
              </Button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p>暂无绑定账号</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 border border-gray-100 rounded-xl hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => openEditModal(account)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary-bg text-primary flex items-center justify-center font-bold text-lg">
                        {account.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{account.name}</div>
                        {account.xiaohongshuId && (
                          <div className="text-xs text-gray-400">ID: {account.xiaohongshuId}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm text-gray-500">待发布 0</span>
                      <Badge variant={account.status === 'active' ? 'blue' : 'orange'}>
                        {account.status === 'active' ? '绑定账户' : '待绑定'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardBody className="flex flex-col gap-3">
            <Button onClick={() => router.push('/create')}>✍️ 开始创作新笔记</Button>
            <Button variant="outline" onClick={() => router.push('/analytics')}>
              📈 查看数据分析
            </Button>
            <Button variant="outline" onClick={() => router.push('/drafts')}>
              📋 管理笔记库
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Account Modal */}
      <Modal open={showAccountModal} onOpenChange={setShowAccountModal}>
        <ModalContent>
          <ModalHeader>
            <h3>{editingAccount ? '编辑账号' : '添加账号'}</h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="小红书账号名称 *"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              />
              <Input
                label="小红书 ID"
                value={accountForm.xiaohongshuId}
                onChange={(e) => setAccountForm({ ...accountForm, xiaohongshuId: e.target.value })}
              />
              <Input
                label="联系邮箱"
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
              />
              <Input
                label="手机号"
                value={accountForm.phone}
                onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
              />
              <Input
                label="账号定位（一句话）*"
                value={accountForm.position}
                onChange={(e) => setAccountForm({ ...accountForm, position: e.target.value })}
              />
              <Input
                label="目标受众 *"
                value={accountForm.audience}
                onChange={(e) => setAccountForm({ ...accountForm, audience: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  人设详细描述 *（1000字限制）
                </label>
                <textarea
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 h-32 resize-none"
                  value={accountForm.description}
                  onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value.slice(0, 1000) })}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            {editingAccount && (
              <Button variant="danger" onClick={() => handleDeleteAccount(editingAccount.id)}>
                删除
              </Button>
            )}
            <Button variant="outline" onClick={() => { setShowAccountModal(false); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleSaveAccount}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}