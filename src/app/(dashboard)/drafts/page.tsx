// src/app/(dashboard)/drafts/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/components/ui/modal'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useAccountStore } from '@/stores/account-store'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Note, NoteWithAccount } from '@/types'

export default function DraftsPage() {
  const { accounts, selectedAccountId, selectAccount } = useAccountStore()
  const [pendingNotes, setPendingNotes] = useState<NoteWithAccount[]>([])
  const [publishedNotes, setPublishedNotes] = useState<NoteWithAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNote, setSelectedNote] = useState<NoteWithAccount | null>(null)

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

  const NoteCard = ({ note }: { note: NoteWithAccount }) => (
    <div
      className="p-4 border border-gray-100 rounded-xl hover:border-primary/30 cursor-pointer transition-colors"
      onClick={() => setSelectedNote(note)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium line-clamp-2 flex-1">{note.title}</h4>
        {note.status === 'published' && (
          <Badge variant="green">已发布</Badge>
        )}
      </div>
      {note.account && (
        <div className="text-xs text-gray-400 mb-2">{note.account.name}</div>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(note.createdAt)}</span>
        {note.status === 'published' ? (
          <span>👍 {note.likes} 💬 {note.comments}</span>
        ) : (
          <span>待发布</span>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Header
        title="笔记库"
        rightContent={
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

      {/* Note Detail Modal */}
      <Modal open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <ModalContent>
          <ModalHeader>
            <h3>{selectedNote?.title}</h3>
          </ModalHeader>
          <ModalBody>
            {selectedNote && (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  {selectedNote.account?.name} · {formatDate(selectedNote.publishedAt || selectedNote.createdAt)}
                </div>
                <div className="bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">
                  {selectedNote.content}
                </div>
                {selectedNote.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedNote.images.map((img, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
                    ))}
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
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}