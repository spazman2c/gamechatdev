import type { PresenceStatus } from './presence'

export interface User {
  id: string
  username: string
  displayName: string
  email: string
  emailVerified: boolean
  avatarUrl: string | null
  bio: string | null
  presence: PresenceStatus
  createdAt: string
  updatedAt: string
}

export type PublicUser = Omit<User, 'email' | 'emailVerified'>

export interface MutualHub {
  id: string
  name: string
  iconUrl: string | null
}

export interface UserProfile extends PublicUser {
  mutualHubs: MutualHub[]
  mutualFriends?: number
}
