'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { HubSidebar, MembersPanel } from '@/components/hub/hub-sidebar'
import { useHub } from '@/hooks/use-hub'
import { useHubSocket } from '@/hooks/use-hub-socket'
import { useHubUI } from '@/store/hub-ui'
import { SkeletonChannelRow } from '@nexora/ui/skeleton'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const { hubId } = useParams<{ hubId: string }>()
  const { isLoading, isError } = useHub(hubId)
  const showMembers = useHubUI((s) => s.showMembers)
  const closeMembers = useHubUI((s) => s.closeMembers)
  useHubSocket(hubId)

  // Close members panel when switching hubs
  useEffect(() => { closeMembers() }, [hubId, closeMembers])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Channel list */}
      <div className="w-60 shrink-0 flex flex-col bg-[var(--surface-raised)] border-r border-[var(--border-subtle)] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-1 p-2 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonChannelRow key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="p-4 text-sm text-[var(--functional-error)]">
            Failed to load hub
          </div>
        ) : (
          <HubSidebar hubId={hubId} />
        )}
      </div>

      {/* Center: Active Surface */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {children}
      </div>

      {/* Right: Members panel */}
      {showMembers && (
        <div className="w-60 shrink-0 flex flex-col bg-[var(--surface-raised)] border-l border-[var(--border-subtle)] overflow-hidden animate-fade-in">
          <MembersPanel hubId={hubId} />
        </div>
      )}
    </div>
  )
}
