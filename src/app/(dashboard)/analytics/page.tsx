// src/app/(dashboard)/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { SyncModal } from '@/components/modals/SyncModal'
import { useAccountStore } from '@/stores/account-store'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { NoteWithAccount, AnalyticsFilter, SortField, SortDirection } from '@/types'

export default function AnalyticsPage() {
  const { accounts, selectedAccountId, selectAccount } = useAccountStore()
  const [notes, setNotes] = useState<NoteWithAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [filter, setFilter] = useState<AnalyticsFilter>({})
  const [sortField, setSortField] = useState<SortField>('publishedAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  useEffect(() => {
    loadAnalytics()
  }, [selectedAccountId, filter])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedAccountId) params.append('accountId', selectedAccountId)
      if (filter.startDate) params.append('startDate', filter.startDate)
      if (filter.endDate) params.append('endDate', filter.endDate)

      const res = await api.get(`/notes?status=published&${params.toString()}&limit=100`)
      if (res.data.success) {
        setNotes(res.data.data.notes)
      }
    } catch (error) {
      console.error('Load analytics error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortField === 'publishedAt') {
      const aDate = new Date(a.publishedAt || a.createdAt).getTime()
      const bDate = new Date(b.publishedAt || b.createdAt).getTime()
      return sortDir === 'asc' ? aDate - bDate : bDate - aDate
    }
    const aVal = (a[sortField] as number) || 0
    const bVal = (b[sortField] as number) || 0
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  const filteredNotes = sortedNotes.filter(note => {
    if (filter.likesMin && note.likes < filter.likesMin) return false
    if (filter.likesMax && note.likes > filter.likesMax) return false
    if (filter.bookmarksMin && note.bookmarks < filter.bookmarksMin) return false
    if (filter.bookmarksMax && note.bookmarks > filter.bookmarksMax) return false
    if (filter.commentsMin && note.comments < filter.commentsMin) return false
    if (filter.commentsMax && note.comments > filter.commentsMax) return false
    return true
  })

  const handleExportCSV = () => {
    const escapeCSVField = (field: any): string => {
      const str = String(field || '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headers = ['标题', '内容', '账号', '点赞', '评论', '收藏', '转发', '发布时间']
    const rows = filteredNotes.map(n => [
      n.title,
      n.content || '',
      n.account?.name || '',
      n.likes,
      n.comments,
      n.bookmarks,
      n.shares,
      formatDate(n.publishedAt || n.createdAt),
    ])

    const csv = [headers, ...rows.map(row => row.map(escapeCSVField))].map(row => row.join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-xs opacity-40">
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <>
      <Header
        title="数据分析"
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSyncModalOpen(true)}
            >
              🔄 同步数据
            </Button>
            <Select value={selectedAccountId || 'all'} onValueChange={(v) => selectAccount(v === 'all' ? null : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部账号" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部账号</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="p-6">
        {/* Filter Bar */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-500">时间</label>
                <input
                  type="date"
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                  value={filter.startDate || ''}
                  onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                  value={filter.endDate || ''}
                  onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                />
              </div>

              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-500">点赞</label>
                <input
                  type="number"
                  placeholder="最小"
                  className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                  value={filter.likesMin || ''}
                  onChange={(e) => setFilter({ ...filter, likesMin: Number(e.target.value) })}
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  placeholder="最大"
                  className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                  value={filter.likesMax || ''}
                  onChange={(e) => setFilter({ ...filter, likesMax: Number(e.target.value) })}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter({})}
              >
                重置
              </Button>

              <div className="ml-auto">
                <Button size="sm" onClick={handleExportCSV}>
                  📥 导出 CSV
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Data Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">笔记</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">内容</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">账号</th>
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('likes')}
                  >
                    点赞 <SortIcon field="likes" />
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('comments')}
                  >
                    评论 <SortIcon field="comments" />
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('bookmarks')}
                  >
                    收藏 <SortIcon field="bookmarks" />
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('shares')}
                  >
                    转发 <SortIcon field="shares" />
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:text-primary"
                    onClick={() => handleSort('publishedAt')}
                  >
                    发布时间 <SortIcon field="publishedAt" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((note) => (
                    <tr key={note.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <a
                          href={note.xiaohongshuUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline line-clamp-2"
                        >
                          {note.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-gray-600 line-clamp-2 text-xs leading-relaxed">
                          {note.content || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{note.account?.name || '-'}</td>
                      <td className="px-4 py-3">{note.likes}</td>
                      <td className="px-4 py-3">{note.comments}</td>
                      <td className="px-4 py-3">{note.bookmarks}</td>
                      <td className="px-4 py-3">{note.shares}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(note.publishedAt || note.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">共 {filteredNotes.length} 条</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>上一页</Button>
              <Button variant="outline" size="sm" disabled>下一页</Button>
            </div>
          </div>
        </Card>
      </div>

      <SyncModal open={syncModalOpen} onOpenChange={setSyncModalOpen} onSynced={loadAnalytics} />
    </>
  )
}