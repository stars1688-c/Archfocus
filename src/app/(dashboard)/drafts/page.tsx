// src/app/(dashboard)/drafts/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/components/ui/modal'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { SyncModal } from '@/components/modals/SyncModal'
import { useAccountStore } from '@/stores/account-store'
import api from '@/lib/api'
import { formatDate, copyToClipboard } from '@/lib/utils'
import type { Note, NoteWithAccount } from '@/types'

export default function DraftsPage() {
  const { accounts, selectedAccountId, selectAccount } = useAccountStore()
  const [pendingNotes, setPendingNotes] = useState<NoteWithAccount[]>([])
  const [publishedNotes, setPublishedNotes] = useState<NoteWithAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNote, setSelectedNote] = useState<NoteWithAccount | null>(null)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })
  const copyInputRef = useRef<HTMLTextAreaElement>(null)

  // 使用 Modal 内预置的 textarea 进行复制（避免 Portal 内动态创建元素导致的 iOS 兼容问题）
  const copyText = (text: string) => {
    const input = copyInputRef.current
    if (!input) return
    input.value = text
    input.style.display = 'block'
    input.focus()
    input.select()
    input.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    input.style.display = 'none'
    if (ok) {
      setToast({ show: true, message: '已复制到剪贴板', type: 'success' })
    } else {
      setToast({ show: true, message: '复制失败，请手动选择文字复制', type: 'error' })
    }
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000)
  }

  useEffect(() => {
    loadNotes()
  }, [selectedAccountId])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const params = selectedAccountId ? `&accountId=${selectedAccountId}` : ''

      const [pendingRes, publishedRes] = await Promise.all([
        api.get(`/notes?status=pending${params}`),
        api.get(`/notes?status=published${params}&limit=50`),
      ])

      if (pendingRes.data.success) {
        setPendingNotes(pendingRes.data.data.notes)
      }
      if (publishedRes.data.success) {
        setPublishedNotes(publishedRes.data.data.notes)
      }
    } catch (error) {
      console.error('Load notes error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPublished = async (note: NoteWithAccount) => {
    try {
      const res = await api.put('/notes', {
        id: note.id,
        status: 'published',
        publishedAt: new Date().toISOString(),
      })
      if (res.data.success) {
        setPendingNotes(pendingNotes.filter(n => n.id !== note.id))
        setPublishedNotes([res.data.data, ...publishedNotes])
      }
    } catch (error) {
      console.error('Mark published error:', error)
    }
  }

  const handleDeleteNote = async (note: NoteWithAccount) => {
    if (!confirm('确定要删除该笔记吗？')) return

    try {
      const res = await api.delete(`/notes?id=${note.id}`)
      if (res.data.success) {
        setPendingNotes(pendingNotes.filter(n => n.id !== note.id))
        setPublishedNotes(publishedNotes.filter(n => n.id !== note.id))
      }
    } catch (error) {
      console.error('Delete note error:', error)
    }
  }

  // 根据 syncStatus 显示 Badge
const getSyncStatusBadge = (note: NoteWithAccount) => {
  if (note.platformSource === 'external') {
    return <Badge variant="blue">非平台创作</Badge>
  }
  if (note.syncStatus === 'pending_link') {
    return <Badge variant="orange">平台创作，待关联</Badge>
  }
  if (note.syncStatus === 'linked') {
    return <Badge variant="green">平台创作，已关联</Badge>
  }
  return null
}


  const NoteCard = ({ note }: { note: NoteWithAccount }) => (
    <div className="p-4 border border-gray-100 rounded-xl hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h4
          className="font-medium line-clamp-2 flex-1 cursor-pointer hover:text-primary"
          onClick={() => setSelectedNote(note)}
        >
          {note.title}
        </h4>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {note.status === 'published' && getSyncStatusBadge(note)}
          {note.status === 'published' && (
            <Badge variant="green">已发布</Badge>
          )}
        </div>
      </div>
      {note.account && (
        <div className="text-xs text-gray-400 mb-2">{note.account.name}</div>
      )}
      {note.status === 'pending' && note.publishAt && (
        <div className="text-xs text-orange-600 mb-2">
          ⏰ 计划发布：{formatDate(note.publishAt)}
        </div>
      )}
      {note.content && (
        <div
          className="text-sm text-gray-600 line-clamp-3 mb-3 cursor-pointer leading-relaxed"
          onClick={() => setSelectedNote(note)}
        >
          {note.content}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(note.createdAt)}</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-red-500 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteNote(note)
            }}
          >
            删除
          </Button>
          {note.status === 'published' ? (
            <span>👍 {note.likes} 💬 {note.comments}</span>
          ) : (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleMarkPublished(note)
              }}
            >
              标为发布
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Header
        title="笔记库"
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSyncModalOpen(true)}
            >
              🔄 同步笔记
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
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              待发布 <Badge variant="orange" className="ml-2">{pendingNotes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="published">
              已发布 <Badge variant="green" className="ml-2">{publishedNotes.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingNotes.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📝</div>
                <p>暂无待发布笔记</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="published">
            {publishedNotes.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p>暂无已发布笔记</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publishedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SyncModal open={syncModalOpen} onOpenChange={setSyncModalOpen} onSynced={loadNotes} />

      {/* Note Detail Modal */}
      <Modal open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <ModalContent>
          <ModalHeader>
            <div className="flex items-start justify-between gap-4">
              <h3 className="flex-1">{selectedNote?.title}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyText(selectedNote?.title || '')}
              >
                📋 复制
              </Button>
            </div>
          </ModalHeader>
          <ModalBody>
            {/* 预置 textarea 用于手机端复制（在 Portal DOM 内，execCommand 可正常工作） */}
            <textarea
              ref={copyInputRef}
              className="fixed opacity-0 pointer-events-none z-0"
              style={{ left: '1px', top: '1px', width: '1px', height: '1px' }}
              readOnly
              aria-hidden="true"
              tabIndex={-1}
            />
            {selectedNote && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                  <span>{selectedNote.account?.name}</span>
                  {selectedNote.status === 'pending' && selectedNote.publishAt && (
                    <Badge variant="orange">计划发布：{formatDate(selectedNote.publishAt)}</Badge>
                  )}
                  <span>· {formatDate(selectedNote.publishedAt || selectedNote.createdAt)}</span>
                  {selectedNote.status === 'published' && getSyncStatusBadge(selectedNote)}
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-gray-50 rounded-xl p-4 whitespace-pre-wrap flex-1 max-h-80 overflow-y-auto scrollbar-thin">
                    {selectedNote.content}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(selectedNote?.content || '')}
                  >
                    📋 复制
                  </Button>
                </div>
                {selectedNote.images.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">配图 ({selectedNote.images.length})</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          for (let i = 0; i < (selectedNote?.images.length || 0); i++) {
                            await new Promise(resolve => setTimeout(resolve, 300))
                            const link = document.createElement('a')
                            link.href = selectedNote?.images[i] || ''
                            link.download = `配图${i + 1}.jpg`
                            link.click()
                          }
                          alert('图片开始逐个下载')
                        }}
                      >
                        ⬇️ 下载全部
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedNote.images.map((img, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={img}
                            alt={`配图${i + 1}`}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = img
                              link.download = `配图${i + 1}.jpg`
                              link.click()
                              alert('图片已开始下载')
                            }}
                          >
                            ⬇️ 下载
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedNote.status === 'published' && (
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>👍 {selectedNote.likes}</span>
                    <span>💬 {selectedNote.comments}</span>
                    <span>⭐ {selectedNote.bookmarks}</span>
                    <span>↗️ {selectedNote.shares}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {selectedNote.status === 'pending' && (
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleMarkPublished(selectedNote)
                        setSelectedNote(null)
                      }}
                    >
                      ✅ 标为已发布
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      handleDeleteNote(selectedNote)
                      setSelectedNote(null)
                    }}
                  >
                    删除笔记
                  </Button>
                </div>
              </div>
            )}
          </ModalBody>
        </ModalContent>

      </Modal>

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