'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { useHubStore } from '@/store/hub'

export function DeleteServerTab({ hubId, hubName }: { hubId: string; hubName: string }) {
  const [confirm, setConfirm] = useState('')
  const router = useRouter()
  const { clear } = useHubStore()

  const mutation = useMutation({
    mutationFn: () => api.delete(`/hubs/${hubId}`),
    onSuccess: () => {
      clear()
      notify.success('Server deleted.')
      router.push('/app')
    },
    onError: () => notify.error('Failed to delete server'),
  })

  const canDelete = confirm === hubName

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Delete Server</h2>

      <div className="p-5 bg-[var(--functional-error-bg)] border border-[var(--functional-error)] rounded-[var(--radius-md)] mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[var(--functional-error)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--functional-error)] mb-1">This action is permanent</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Deleting <strong className="text-[var(--text-primary)]">{hubName}</strong> will permanently erase all channels,
              messages, members, and settings. This cannot be undone.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Type <span className="font-bold text-[var(--text-primary)]">{hubName}</span> to confirm
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={hubName}
            className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--functional-error)] transition-colors"
          />
        </div>

        <Button
          variant="danger"
          onClick={() => mutation.mutate()}
          disabled={!canDelete}
          loading={mutation.isPending}
          className="flex items-center gap-2 self-start"
        >
          <Trash2 className="h-4 w-4" />
          Delete Server
        </Button>
      </div>
    </div>
  )
}
