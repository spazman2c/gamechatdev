'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { useHubStore } from '@/store/hub'
import { cn } from '@/lib/utils'
import type { Hub } from '@nexora/types'

export function EngagementTab({ hubId, hub }: { hubId: string; hub: Hub | null }) {
  const queryClient = useQueryClient()
  const { updateHub: updateHubStore, channels } = useHubStore()
  const textChannels = channels.filter((c) => c.type === 'text')
  const [systemChannelId, setSystemChannelId] = useState<string>(hub?.systemChannelId ?? '')

  const mutation = useMutation({
    mutationFn: () => api.patch<Hub>(`/hubs/${hubId}`, { systemChannelId: systemChannelId || null }),
    onSuccess: (res) => {
      updateHubStore(res.data)
      queryClient.invalidateQueries({ queryKey: ['hub', hubId] })
      notify.success('Engagement settings saved!')
    },
    onError: () => notify.error('Failed to save settings'),
  })

  const dirty = systemChannelId !== (hub?.systemChannelId ?? '')

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Engagement</h2>

      {/* System Messages Channel */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">System Messages</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Choose which channel receives system messages like member joins and server boosts.
        </p>
        <select
          value={systemChannelId}
          onChange={(e) => setSystemChannelId(e.target.value)}
          className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
        >
          <option value="">No system channel</option>
          {textChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>#{ch.name}</option>
          ))}
        </select>
      </section>

      {/* Stub toggles for common engagement features */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">System Message Events</h3>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Send a message when someone joins the server', desc: 'Post a welcome message in the system channel' },
            { label: 'Send a message when someone boosts the server', desc: 'Celebrate boosts in the system channel' },
            { label: 'Send helpful tips for new servers', desc: 'Nexora shares tips to help you set up your server' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 bg-[var(--surface-panel)] rounded-[var(--radius-sm)] border border-[var(--border-default)] opacity-50">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
              </div>
              <span className="text-xs text-[var(--text-muted)] italic">Requires system channel</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={!dirty} loading={mutation.isPending}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}
