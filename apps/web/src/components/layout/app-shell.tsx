'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useSocket } from '@/hooks/use-socket'
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

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  // Ensure we have a valid token before rendering. Returns null (invisible) until
  // the single shared refresh promise resolves — no spinner, no 401s.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || tokenReady) return
    getOrRefreshToken().then((token) => {
      if (token) setTokenReady(true)
      // if null → clearAuth was called → isAuthenticated becomes false → redirect below
    })
  }, [hydrated, isAuthenticated, tokenReady])

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/login')
  }, [hydrated, isAuthenticated, router])

  if (!hydrated || !isAuthenticated || !tokenReady) return null
  return <AppShellInner>{children}</AppShellInner>
}

// Inner component mounts only after auth is confirmed, so useSocket()
// can create the connection eagerly before any voice-room page loads.
// VoiceSessionProvider lives here so it is never torn down by hub-layout
// re-renders — the voice connection persists across all navigation.
function AppShellInner({ children }: AppShellProps) {
  useSocket()

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

