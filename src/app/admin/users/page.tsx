'use client'

import { useEffect, useState, useCallback } from 'react'

interface AdminUser {
  id: string
  phone: string
  name: string | null
  createdAt: string
  accountCount: number
}

interface FormData {
  phone: string
  password: string
  name: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formData, setFormData] = useState<FormData>({ phone: '', password: '', name: '' })
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  const pageSize = 20

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) return

      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('pageSize', String(pageSize))
      if (keyword) params.append('keyword', keyword)

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (data.success) {
        setUsers(data.data.users)
        setTotal(data.data.total)
      }
    } catch (err) {
      console.error('Load users error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({ phone: '', password: '', name: '' })
    setModalError('')
    setShowModal(true)
  }

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user)
    setFormData({ phone: user.phone, password: '', name: user.name || '' })
    setModalError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setModalError('')

    if (!formData.phone.trim()) {
      setModalError('手机号不能为空')
      return
    }
    if (!editingUser && !formData.password) {
      setModalError('密码不能为空')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) return

      const body: any = {
        phone: formData.phone.trim(),
        name: formData.name.trim() || null,
      }
      if (formData.password) body.password = formData.password
      if (editingUser) body.id = editingUser.id

      const res = await fetch(`/api/admin/users`, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success) {
        setShowModal(false)
        loadUsers()
      } else {
        setModalError(data.error || '操作失败')
      }
    } catch (err) {
      setModalError('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`确定要删除用户「${user.phone}」吗？此操作不可撤销！`)) return

    try {
      const token = localStorage.getItem('admin_token')
      if (!token) return

      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (data.success) {
        loadUsers()
      } else {
        alert(data.error || '删除失败')
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">用户管理</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            + 新增用户
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Search */}
        <div className="mb-4">
          <div className="flex gap-2 max-w-md">
            <input
              className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl outline-none text-sm focus:border-primary"
              placeholder="搜索手机号或姓名..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
            />
            <button
              onClick={() => loadUsers()}
              className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              搜索
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">手机号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">姓名</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">关联账号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">注册时间</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">加载中...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">暂无用户</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{user.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{user.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{user.accountCount}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-xs text-primary hover:underline"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">共 {total} 条</span>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-500">{page}/{totalPages}</span>
                <button
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium">{editingUser ? '编辑用户' : '新增用户'}</h3>
            </div>
            <div className="p-6 space-y-4">
              {modalError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{modalError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">手机号 *</label>
                <input
                  type="tel"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary text-sm"
                  placeholder="输入手机号"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">
                  密码 {editingUser ? '(不填则不修改)' : '*'}
                </label>
                <input
                  type="password"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary text-sm"
                  placeholder={editingUser ? '留空不修改密码' : '输入密码'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">姓名</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary text-sm"
                  placeholder="输入姓名（可选）"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
