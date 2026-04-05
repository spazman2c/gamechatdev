import type { AtmosphereId } from './atmosphere'

export type JoinPolicy =
  | 'open'
  | 'invite_only'
  | 'email_confirmed'
  | 'phone_confirmed'
  | 'mutual_vouch'
  | 'waitlist'
  | 'age_gated'

export interface Hub {
  id: string
  ownerId: string
  name: string
  slug: string | null
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  bannerColor: string | null
  atmosphere: AtmosphereId
  isPublic: boolean
  joinPolicy: JoinPolicy
  memberCount: number
  verificationLevel: number
  contentFilter: number
  isCommunity: boolean
  systemChannelId: string | null
  createdAt: string
}

export interface Zone {
  id: string
  hubId: string
  name: string
  position: number
  createdAt: string
}

export interface HubMember {
  hubId: string
  userId: string
  joinedAt: string
  nickname: string | null
  roles: string[]
}

export interface Invite {
  code: string
  hubId: string
  createdBy: string
  uses: number
  maxUses: number | null
  expiresAt: string | null
  createdAt: string
}
