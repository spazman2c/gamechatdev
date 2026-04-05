'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, FolderPlus } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { useHubStore } from '@/store/hub'
import type { Zone } from '@nexora/types'

const Schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})
type FormData = z.infer<typeof Schema>

interface Props {
  hubId: string
  onClose: () => void
}

export function CreateCategoryModal({ hubId, onClose }: Props) {
  const queryClient = useQueryClient()
  const { addZone } = useHubStore()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(Schema),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post<Zone>(`/hubs/${hubId}/zones`, data),
    onSuccess: (res) => {
      addZone(res.data)
      queryClient.invalidateQueries({ queryKey: ['hub', hubId] })
      notify.success('Category created!', res.data.name)
      onClose()
    },
    onError: () => notify.error('Failed to create category'),
  })

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-sm bg-[var(--surface-panel)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-[var(--accent-primary)]" />
            <h2 className="font-brand font-bold text-lg text-[var(--text-primary)]">Create Category</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 pb-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Category Name
            </label>
            <input
              {...register('name')}
              placeholder="e.g. VOICE CHANNELS"
              className="w-full bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            {errors.name && (
              <p className="text-xs text-[var(--functional-error)] mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create Category
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
