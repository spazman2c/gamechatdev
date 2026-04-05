'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useHubStore } from '@/store/hub'

export default function HubIndexPage() {
  const { hubId } = useParams<{ hubId: string }>()
  const { channels } = useHubStore()
  const router = useRouter()
  const didRedirect = useRef(false)

  // Redirect to first text channel once. Guard with a ref so React Strict Mode's
  // double-invocation of effects doesn't navigate twice (or back over a
  // manually-chosen channel).
  useEffect(() => {
    if (didRedirect.current) { return }
    const first = channels.find((c) => c.type === 'text' || c.type === 'announcement')
    if (first) {
      didRedirect.current = true
      router.replace(`/app/hub/${hubId}/stream/${first.id}`)
    }
  }, [channels, hubId, router])

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-[var(--text-muted)] text-sm">Select a stream to start chatting.</p>
    </div>
  )
}
