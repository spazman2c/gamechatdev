'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sticker, Trash2, Upload } from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'

interface HubSticker {
  id: string
  hubId: string
  name: string
  description: string | null
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

const MAX_STICKERS = 5

export function StickersTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['stickers', hubId],
    queryFn: () => api.get<{ stickers: HubSticker[] }>(`/hubs/${hubId}/stickers`).then((r) => r.data.stickers),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hubs/${hubId}/stickers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers', hubId] })
      notify.success('Sticker deleted')
    },
    onError: () => notify.error('Failed to delete sticker'),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPreview(URL.createObjectURL(file))
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
  }

  async function handleUpload() {
    if (!pendingFile || !name.trim()) return
    setUploading(true)
    try {
      const url = await presignAndUpload(pendingFile)
      await api.post(`/hubs/${hubId}/stickers`, { name: name.trim(), url, description: description.trim() || undefined })
      queryClient.invalidateQueries({ queryKey: ['stickers', hubId] })
      notify.success('Sticker uploaded!')
      setPendingFile(null)
      setPreview(null)
      setName('')
      setDescription('')
    } catch {
      notify.error('Failed to upload sticker')
    } finally {
      setUploading(false)
    }
  }

  const stickers = data ?? []
  const slotsUsed = stickers.length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">Stickers</h2>
        <span className="text-sm text-[var(--text-muted)]">{slotsUsed} / {MAX_STICKERS} slots</span>
      </div>

      <div className="w-full h-1.5 bg-[var(--surface-panel)] rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[var(--accent-secondary)] rounded-full transition-all"
          style={{ width: `${Math.min((slotsUsed / MAX_STICKERS) * 100, 100)}%` }}
        />
      </div>

      {slotsUsed < MAX_STICKERS && (
        <div className="mb-6 p-4 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Upload Sticker</h3>
          <div className="flex gap-3">
            <div
              className="h-20 w-20 rounded-[var(--radius-sm)] bg-[var(--surface-base)] border border-dashed border-[var(--border-default)] flex items-center justify-center cursor-pointer hover:border-[var(--accent-primary)] transition-colors shrink-0"
              onClick={() => inputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-[var(--radius-sm)]" />
              ) : (
                <Upload className="h-6 w-6 text-[var(--text-muted)]" />
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="flex flex-col gap-2 flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sticker name"
                className="bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <Button size="sm" onClick={handleUpload} disabled={!pendingFile || !name.trim()} loading={uploading}>
                Upload
              </Button>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">PNG or APNG, 320×320px recommended. Max 512KB.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[var(--radius-md)] bg-[var(--surface-panel)] animate-pulse" />
          ))}
        </div>
      ) : stickers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-[var(--text-muted)]">
          <Sticker className="h-10 w-10 opacity-30" />
          <p className="text-sm">No stickers yet. Upload one to get started!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stickers.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 px-4 py-3 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] group"
            >
              <img src={s.url} alt={s.name} className="h-16 w-16 rounded object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                {s.description && <p className="text-xs text-[var(--text-muted)] truncate">{s.description}</p>}
              </div>
              <button
                onClick={() => deleteMutation.mutate(s.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)] transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
