'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Smile, Trash2, Upload } from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'

interface HubEmoji {
  id: string
  hubId: string
  name: string
  url: string
  createdAt: string
}

async function presignAndUpload(file: File): Promise<string> {
  const res = await api.post<{ presignedUrl: string; publicUrl: string }>('/uploads/presign', {
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  })
  await fetch(res.data.presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
  return res.data.publicUrl
}

const MAX_EMOJI = 50

export function EmojiTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [emojiName, setEmojiName] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['emoji', hubId],
    queryFn: () => api.get<{ emoji: HubEmoji[] }>(`/hubs/${hubId}/emoji`).then((r) => r.data.emoji),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hubs/${hubId}/emoji/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji', hubId] })
      notify.success('Emoji deleted')
    },
    onError: () => notify.error('Failed to delete emoji'),
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
    if (!emojiName) {
      setEmojiName(file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_]/gi, '_').toLowerCase())
    }
  }

  async function handleUpload() {
    if (!pendingFile || !emojiName.trim()) return
    setUploading(true)
    try {
      const url = await presignAndUpload(pendingFile)
      await api.post(`/hubs/${hubId}/emoji`, { name: emojiName.trim(), url })
      queryClient.invalidateQueries({ queryKey: ['emoji', hubId] })
      notify.success('Emoji uploaded!')
      setPendingFile(null)
      setPreview(null)
      setEmojiName('')
    } catch {
      notify.error('Failed to upload emoji')
    } finally {
      setUploading(false)
    }
  }

  const emoji = data ?? []
  const slotsUsed = emoji.length
  const slotsTotal = MAX_EMOJI

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">Emoji</h2>
        <span className="text-sm text-[var(--text-muted)]">{slotsUsed} / {slotsTotal} slots</span>
      </div>

      {/* Slot bar */}
      <div className="w-full h-1.5 bg-[var(--surface-panel)] rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
          style={{ width: `${Math.min((slotsUsed / slotsTotal) * 100, 100)}%` }}
        />
      </div>

      {/* Upload section */}
      {slotsUsed < slotsTotal && (
        <div className="mb-6 p-4 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Upload Emoji</h3>
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 rounded-[var(--radius-sm)] bg-[var(--surface-base)] border border-dashed border-[var(--border-default)] flex items-center justify-center cursor-pointer hover:border-[var(--accent-primary)] transition-colors shrink-0"
              onClick={() => inputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-[var(--radius-sm)]" />
              ) : (
                <Upload className="h-5 w-5 text-[var(--text-muted)]" />
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <input
              type="text"
              value={emojiName}
              onChange={(e) => setEmojiName(e.target.value)}
              placeholder="emoji_name"
              className="flex-1 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={!pendingFile || !emojiName.trim()}
              loading={uploading}
            >
              Upload
            </Button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">Recommended 128×128px PNG. Max 256KB.</p>
        </div>
      )}

      {/* Emoji grid */}
      {isLoading ? (
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-square rounded bg-[var(--surface-panel)] animate-pulse" />
          ))}
        </div>
      ) : emoji.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-[var(--text-muted)]">
          <Smile className="h-10 w-10 opacity-30" />
          <p className="text-sm">No custom emoji yet. Upload one to get started!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {emoji.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] group transition-colors"
            >
              <img src={e.url} alt={e.name} className="h-8 w-8 rounded object-contain" />
              <span className="text-sm text-[var(--text-primary)] flex-1 font-mono">:{e.name}:</span>
              <button
                onClick={() => deleteMutation.mutate(e.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)] transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
