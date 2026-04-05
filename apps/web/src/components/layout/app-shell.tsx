'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useSocket } from '@/hooks/use-socket'
import { usePresence } from '@/hooks/use-presence'
import { useNotifications } from '@/hooks/use-notifications'
import { getOrRefreshToken } from '@/lib/api'
import { SpaceRail } from './space-rail'
import { LivePulseBar } from './live-pulse-bar'
import { NotificationToasts } from '@/components/modals/notification-toast'
import { UserProfileModal } from '@/components/modals/user-profile-modal'
import { UserContextMenu } from '@/components/modals/user-context-menu'
import { InviteModal } from '@/components/modals/invite-modal'
import { VoiceSessionProvider } from '@/contexts/voice-session-context'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  // Start as true if a token is already in the store (e.g. soft nav after first load).
  // Only false on a cold hard-refresh where the token needs to be fetched first.
  const [tokenReady, setTokenReady] = useState(() => !!useAuthStore.getState().accessToken)
  const [refreshFailed, setRefreshFailed] = useState(false)

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  // Ensure we have a valid token before rendering. Returns null (invisible) until
  // the single shared refresh promise resolves — no spinner, no 401s.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || tokenReady) return
    setRefreshFailed(false)
    getOrRefreshToken().then((token) => {
      if (token) {
        setTokenReady(true)
      } else if (useAuthStore.getState().isAuthenticated) {
        // null but still authenticated = network error (not a logout)
        setRefreshFailed(true)
      }
      // if isAuthenticated is now false, clearAuth was called → redirect below handles it
    })
  }, [hydrated, isAuthenticated, tokenReady])

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/login')
  }, [hydrated, isAuthenticated, router])

  if (!hydrated || !isAuthenticated) return null

  if (!tokenReady) {
    if (refreshFailed) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[var(--surface-base)] gap-4">
          <p className="text-[var(--text-muted)] text-sm">Unable to connect. Check your connection and try again.</p>
          <button
            onClick={() => {
              setRefreshFailed(false)
              getOrRefreshToken().then((token) => {
                if (token) setTokenReady(true)
                else if (useAuthStore.getState().isAuthenticated) setRefreshFailed(true)
              })
            }}
            className="px-4 py-2 text-sm bg-[var(--accent-primary)] text-white rounded-[var(--radius-sm)] hover:bg-[var(--accent-primary-light)] transition-colors"
          >
            Retry
          </button>
        </div>
      )
    }
    return null
  }
  return <AppShellInner>{children}</AppShellInner>
}

// Inner component mounts only after auth is confirmed, so useSocket()
// can create the connection eagerly before any voice-room page loads.
// VoiceSessionProvider lives here so it is never torn down by hub-layout
// re-renders — the voice connection persists across all navigation.
function AppShellInner({ children }: AppShellProps) {
  useSocket()
  usePresence()
  useNotifications()

  return (
    <VoiceSessionProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-[var(--surface-base)]">
        {/* Live Pulse Bar */}
        <LivePulseBar />

        {/* Main shell: Space Rail + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Layer 1: Space Rail (hub icons) */}
          <SpaceRail />

          {/* Layer 2+3: Context Panel + Active Surface — rendered by child routes */}
          <main className="flex flex-1 overflow-hidden">
            {children}
          </main>
        </div>
        <NotificationToasts />
        <UserProfileModal />
        <UserContextMenu />
        <InviteModal />
      </div>
    </VoiceSessionProvider>
  )
}

