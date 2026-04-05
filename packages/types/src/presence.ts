export type PresenceStatus =
  | 'online'
  | 'open_to_chat'
  | 'focused'
  | 'listening_only'
  | 'available_for_calls'
  | 'co_op'
  | 'hosting'
  | 'quiet'
  | 'offline'

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  open_to_chat: 'Open to chat',
  focused: 'Focused',
  listening_only: 'Listening only',
  available_for_calls: 'Available for calls',
  co_op: 'Co-op mode',
  hosting: 'Hosting',
  quiet: 'Quiet mode',
  offline: 'Offline',
}

export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: '#38D39F',
  open_to_chat: '#3EE6B5',
  focused: '#FFB84D',
  listening_only: '#5AB2FF',
  available_for_calls: '#7C5CFF',
  co_op: '#39D5FF',
  hosting: '#FF6FAE',
  quiet: '#AAB8D6',
  offline: '#4A5568',
}
