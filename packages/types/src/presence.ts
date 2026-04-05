export type PresenceStatus =
  | 'online'
  | 'away'
  | 'busy'
  | 'offline'
  | 'open_to_chat'
  | 'focused'
  | 'listening_only'
  | 'available_for_calls'
  | 'co_op'
  | 'hosting'
  | 'quiet'

export const CORE_STATUSES: PresenceStatus[] = ['online', 'away', 'busy', 'offline']

export const CUSTOM_STATUSES: PresenceStatus[] = [
  'open_to_chat',
  'focused',
  'listening_only',
  'available_for_calls',
  'co_op',
  'hosting',
  'quiet',
]

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Do Not Disturb',
  offline: 'Appear Offline',
  open_to_chat: 'Open to chat',
  focused: 'Focused',
  listening_only: 'Listening only',
  available_for_calls: 'Available for calls',
  co_op: 'Co-op mode',
  hosting: 'Hosting',
  quiet: 'Quiet mode',
}

export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: '#38D39F',
  away: '#FFB84D',
  busy: '#FF5555',
  offline: '#4A5568',
  open_to_chat: '#3EE6B5',
  focused: '#FFB84D',
  listening_only: '#5AB2FF',
  available_for_calls: '#7C5CFF',
  co_op: '#39D5FF',
  hosting: '#FF6FAE',
  quiet: '#AAB8D6',
}
