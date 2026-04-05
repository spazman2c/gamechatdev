'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X } from 'lucide-react'
import { UpdateHubSchema, type UpdateHubInput } from '@nexora/schemas'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { useHubStore } from '@/store/hub'
import { cn } from '@/lib/utils'
import type { Hub } from '@nexora/types'

const ATMOSPHERES = [
  { id: 'orbit',  label: 'Orbit',  desc: 'General community' },
  { id: 'arcade', label: 'Arcade', desc: 'Gaming & esports' },
  { id: 'studio', label: 'Studio', desc: 'Creative & art' },
  { id: 'lounge', label: 'Lounge', desc: 'Chill & social' },
  { id: 'guild',  label: 'Guild',  desc: 'Teams & guilds' },
] as const

async function presignAndUpload(file: File): Promise<string> {
  const presignRes = await api.post<{ presignedUrl: string; publicUrl: string }>('/uploads/presign', {
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  })
  await fetch(presignRes.data.presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
  return presignRes.data.publicUrl
}

export function ServerProfileTab({ hubId, hub }: { hubId: string; hub: Hub | null }) {
  const queryClient = useQueryClient()
  const { updateHub: updateHubStore } = useHubStore()
  const iconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(hub?.iconUrl ?? null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(hub?.bannerUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [bannerColor, setBannerColor] = useState(hub?.bannerColor ?? '#5865F2')

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<UpdateHubInput>({
    resolver: zodResolver(UpdateHubSchema),
    defaultValues: {
      name: hub?.name ?? '',
      description: hub?.description ?? '',
      isPublic: hub?.isPublic ?? true,
      atmosphere: hub?.atmosphere ?? 'orbit',
      iconUrl: hub?.iconUrl ?? null,
      bannerUrl: hub?.bannerUrl ?? null,
      bannerColor: hub?.bannerColor ?? null,
    },
  })

  const atmosphere = watch('atmosphere')

  const mutation = useMutation({
    mutationFn: (data: UpdateHubInput) => api.patch<Hub>(`/hubs/${hubId}`, data),
    onSuccess: (res) => {
      updateHubStore(res.data)
      queryClient.invalidateQueries({ queryKey: ['hub', hubId] })
      notify.success('Server profile saved!')
    },
    onError: () => notify.error('Failed to save server profile'),
  })

  async function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await presignAndUpload(file)
      setIconPreview(url)
      setValue('iconUrl', url, { shouldDirty: true })
    } catch {
      notify.error('Failed to upload icon')
    } finally {
      setUploading(false)
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await presignAndUpload(file)
      setBannerPreview(url)
      setValue('bannerUrl', url, { shouldDirty: true })
    } catch {
      notify.error('Failed to upload banner')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Server Profile</h2>
      <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, bannerColor }))} className="flex flex-col gap-8">

        {/* Server Icon */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Server Icon</h3>
          <div className="flex items-center gap-4">
            <div
              className="relative h-20 w-20 rounded-[var(--radius-md)] overflow-hidden bg-[var(--surface-panel)] border-2 border-dashed border-[var(--border-default)] flex items-center justify-center cursor-pointer hover:border-[var(--accent-primary)] transition-colors group"
              onClick={() => iconInputRef.current?.click()}
            >
              {iconPreview ? (
                <img src={iconPreview} alt="Hub icon" className="h-full w-full object-cover" />
              ) : (
                <Upload className="h-6 w-6 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => iconInputRef.current?.click()} loading={uploading}>
                Upload Image
              </Button>
              {iconPreview && (
                <button
                  type="button"
                  className="text-xs text-[var(--functional-error)] hover:underline"
                  onClick={() => { setIconPreview(null); setValue('iconUrl', null, { shouldDirty: true }) }}
                >
                  Remove icon
                </button>
              )}
              <p className="text-xs text-[var(--text-muted)]">Recommended: 512×512px, PNG or JPG</p>
            </div>
            <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
          </div>
        </section>

        {/* Server Banner */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Server Banner</h3>
          <div
            className="relative w-full h-32 rounded-[var(--radius-md)] overflow-hidden cursor-pointer border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-primary)] transition-colors group flex items-center justify-center"
            style={{ background: bannerPreview ? undefined : bannerColor }}
            onClick={() => bannerInputRef.current?.click()}
          >
            {bannerPreview ? (
              <img src={bannerPreview} alt="Hub banner" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-white/70 group-hover:text-white transition-colors">
                <Upload className="h-6 w-6" />
                <span className="text-xs font-medium">Click to upload banner</span>
              </div>
            )}
            {bannerPreview && (
              <button
                type="button"
                className="absolute top-2 right-2 p-1 rounded bg-black/60 text-white hover:bg-black/80 transition-colors"
                onClick={(e) => { e.stopPropagation(); setBannerPreview(null); setValue('bannerUrl', null, { shouldDirty: true }) }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

          {/* Banner Color */}
          <div className="flex items-center gap-3 mt-3">
            <label className="text-xs text-[var(--text-muted)] font-medium">Banner color</label>
            <input
              type="color"
              value={bannerColor}
              onChange={(e) => { setBannerColor(e.target.value); setValue('bannerColor', e.target.value, { shouldDirty: true }) }}
              className="h-8 w-16 cursor-pointer rounded border border-[var(--border-default)] bg-transparent"
            />
            <span className="text-xs font-mono text-[var(--text-muted)]">{bannerColor}</span>
          </div>
        </section>

        {/* Server Name */}
        <section>
          <label className="block text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Server Name
          </label>
          <input
            {...register('name')}
            className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />
          {errors.name && <p className="text-xs text-[var(--functional-error)] mt-1">{errors.name.message}</p>}
        </section>

        {/* Description */}
        <section>
          <label className="block text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Server Description
          </label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Tell people what your server is about…"
            className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />
        </section>

        {/* Atmosphere */}
        <section>
          <label className="block text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Atmosphere
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ATMOSPHERES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setValue('atmosphere', a.id, { shouldDirty: true })}
                className={cn(
                  'px-3 py-2.5 rounded-[var(--radius-sm)] border text-left text-sm transition-all',
                  atmosphere === a.id
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)]'
                    : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
                )}
              >
                <p className={cn('font-semibold', atmosphere === a.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]')}>
                  {a.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{a.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Public toggle */}
        <section className="flex items-center justify-between px-4 py-3 bg-[var(--surface-panel)] rounded-[var(--radius-sm)] border border-[var(--border-default)]">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Public Server</p>
            <p className="text-xs text-[var(--text-muted)]">Discoverable in the server browser</p>
          </div>
          <input
            type="checkbox"
            {...register('isPublic')}
            className="h-4 w-4 accent-[var(--accent-primary)]"
          />
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty && bannerColor === (hub?.bannerColor ?? '#5865F2')} loading={mutation.isPending || uploading}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
