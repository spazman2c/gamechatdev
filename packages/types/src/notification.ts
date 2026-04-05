export interface AppNotification {
  id: string
  userId: string
  type: 'dm_message' | 'mention' | 'friend_request' | 'hub_invite' | 'system'
  title: string
  body: string | null
  referenceUrl: string | null
  referenceId: string | null
  read: boolean
  createdAt: string
}

export interface NotificationSettings {
  notifDms: boolean
  notifMentions: boolean
  notifHubActivity: boolean
  notifSounds: boolean
  notifDesktop: boolean
}
