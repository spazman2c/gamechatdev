export type ChannelType = 'text' | 'announcement' | 'voice' | 'video' | 'stage'

export type RoomMode =
  | 'hangout'
  | 'study'
  | 'co_work'
  | 'game_squad'
  | 'stage_qa'
  | 'watch_party'
  | 'music_room'
  | 'support_room'

export interface Channel {
  id: string
  hubId: string
  zoneId: string | null
  name: string
  type: ChannelType
  topic: string | null
  position: number
  isNsfw: boolean
  slowmodeDelay: number
  roomMode: RoomMode | null
  capacity: number | null
  createdAt: string
}

export interface ChannelPermissionOverride {
  channelId: string
  targetId: string
  targetType: 'role' | 'user'
  allow: bigint
  deny: bigint
}
