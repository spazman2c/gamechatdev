'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'

interface InviteInfo {
  code: string
  hub: {
    id: string
    name: string
    iconUrl: string | null
    memberCount: number
    atmosphere: string
  }
  expiresAt: string | null
  maxUses: number | null
  uses: number
}

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    api.get<InviteInfo>(`/invites/${code}`)
      .then((r) => setInfo(r.data))
      .catch(() => setError('This invite is invalid or has expired.'))
  }, [code])

  async function handleJoin() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/invite/${code}`)
      return
    }
    setJoining(true)
    try {
      const res = await api.post<{ hubId: string }>(`/invites/${code}/join`)
      notify.success('Joined!', `Welcome to ${info?.hub.name}`)
      router.push(`/app/hub/${res.data.hubId}`)
    } catch (err: any) {
      const code_ = err?.response?.data?.code
      if (code_ === 'ALREADY_HUB_MEMBER') {
        router.push(`/app/hub/${info?.hub.id}`)
      } else {
        notify.error(err?.response?.data?.message ?? 'Failed to join hub')
        setJoining(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)] p-4">
      <div className="w-full max-w-sm">
        {error ? (
          <div className="text-center">
            <div className="text-4xl mb-4">😕</div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Invite Invalid
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-6">{error}</p>
            <button
              onClick={() => router.push('/app')}
              className="px-6 py-2.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white text-sm font-medium hover:bg-[var(--accent-primary-light)] transition-colors"
            >
              Go Home
            </button>
          </div>
        ) : !info ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-[var(--surface-panel)] animate-pulse" />
            <div className="h-4 w-40 rounded bg-[var(--surface-panel)] animate-pulse" />
            <div className="h-3 w-24 rounded bg-[var(--surface-panel)] animate-pulse" />
          </div>
        ) : (
          <div className="bg-[var(--surface-panel)] rounded-[var(--radius-lg)] overflow-hidden shadow-2xl">
            {/* Hub banner area */}
            <div className="h-24 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] relative" />

            {/* Hub icon */}
            <div className="px-6 pb-6">
              <div className="relative -mt-10 mb-4">
                <div className="h-20 w-20 rounded-[var(--radius-md)] overflow-hidden border-4 border-[var(--surface-panel)] bg-[var(--surface-raised)] flex items-center justify-center">
                  {info.hub.iconUrl ? (
                    <img src={info.hub.iconUrl} alt={info.hub.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {info.hub.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                You have been invited to join
              </p>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">{info.hub.name}</h1>

              <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-6">
                <div className="h-2 w-2 rounded-full bg-[var(--functional-success)]" />
                <span>{info.hub.memberCount.toLocaleString()} member{info.hub.memberCount !== 1 ? 's' : ''}</span>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white font-semibold text-sm hover:bg-[var(--accent-primary-light)] transition-colors disabled:opacity-60"
              >
                {joining ? 'Joining…' : isAuthenticated ? 'Accept Invite' : 'Log in to Accept'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
