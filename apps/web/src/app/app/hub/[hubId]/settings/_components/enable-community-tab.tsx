'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Globe, Users, BarChart3, ShieldCheck, Megaphone } from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { useHubStore } from '@/store/hub'
import { cn } from '@/lib/utils'
import type { Hub } from '@nexora/types'

const COMMUNITY_FEATURES = [
  { icon: <Globe className="h-5 w-5" />, label: 'Server Discovery', desc: 'Get listed in public server discovery' },
  { icon: <Users className="h-5 w-5" />, label: 'Membership Screening', desc: 'New members must agree to rules before joining' },
  { icon: <BarChart3 className="h-5 w-5" />, label: 'Server Insights', desc: 'View detailed analytics about your community' },
  { icon: <Megaphone className="h-5 w-5" />, label: 'Announcement Channels', desc: 'Create channels that members can follow' },
  { icon: <ShieldCheck className="h-5 w-5" />, label: 'Enhanced Moderation', desc: 'Access to advanced AutoMod rules and tools' },
]

export function EnableCommunityTab({ hubId, hub }: { hubId: string; hub: Hub | null }) {
  const queryClient = useQueryClient()
  const { updateHub: updateHubStore } = useHubStore()
  const [isCommunity, setIsCommunity] = useState(hub?.isCommunity ?? false)

  const mutation = useMutation({
    mutationFn: (val: boolean) => api.patch<Hub>(`/hubs/${hubId}`, { isCommunity: val }),
    onSuccess: (res) => {
      updateHubStore(res.data)
      queryClient.invalidateQueries({ queryKey: ['hub', hubId] })
      const wasEnabled = !hub?.isCommunity
      notify.success(wasEnabled ? 'Community enabled!' : 'Community disabled.')
    },
    onError: () => notify.error('Failed to update community setting'),
  })

  function toggle() {
    const next = !isCommunity
    setIsCommunity(next)
    mutation.mutate(next)
  }

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-2">Enable Community</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Community servers get access to unique features designed to help you grow and manage your community.
      </p>

      {/* Feature list */}
      <div className="grid grid-cols-1 gap-3 mb-8">
        {COMMUNITY_FEATURES.map((f, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-4 px-4 py-3 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] transition-all',
              isCommunity && 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)]',
            )}
          >
            <span className={cn('shrink-0', isCommunity ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')}>
              {f.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{f.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between p-4 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-md)]">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Community is {isCommunity ? 'enabled' : 'disabled'}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {isCommunity ? 'Your server has access to all community features.' : 'Enable to unlock community features.'}
          </p>
        </div>
        <Button
          variant={isCommunity ? 'secondary' : 'primary'}
          onClick={toggle}
          loading={mutation.isPending}
        >
          {isCommunity ? 'Disable Community' : 'Enable Community'}
        </Button>
      </div>
    </div>
  )
}
