import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a timestamp for chat display */
export function formatMessageTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Format a date divider (Today, Yesterday, or full date) */
export function formatDateDivider(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) { return 'Today' }
  if (diffDays === 1) { return 'Yesterday' }
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

/** Get initials from a display name */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Truncate a string to a max length */
export function truncate(str: string, max: number): string {
  if (str.length <= max) { return str }
  return str.slice(0, max - 1) + '…'
}

/** Generate a consistent color from a string (for avatar fallbacks) */
export function stringToColor(str: string): string {
  const colors = [
    '#7C5CFF', '#39D5FF', '#3EE6B5', '#FF6FAE',
    '#FFB84D', '#5AB2FF', '#9B6AFF', '#FF4088',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length] ?? colors[0]!
}
