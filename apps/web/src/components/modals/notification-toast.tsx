'use client'

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifStore, type Notification, type NotifType } from '@/store/notifications'

const ICONS: Record<NotifType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-[var(--functional-success)]" />,
  error:   <AlertCircle className="h-4 w-4 text-[var(--functional-error)]" />,
  warning: <AlertTriangle className="h-4 w-4 text-[var(--functional-warning)]" />,
  info:    <Info className="h-4 w-4 text-[var(--functional-info)]" />,
}

const BORDER_COLORS: Record<NotifType, string> = {
  success: 'border-l-[var(--functional-success)]',
  error:   'border-l-[var(--functional-error)]',
  warning: 'border-l-[var(--functional-warning)]',
  info:    'border-l-[var(--functional-info)]',
}

export function NotificationToasts() {
  const { notifications, dismiss } = useNotifStore()

  if (notifications.length === 0) { return null }

  return (
    <div
      className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label="Notifications"
    >
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  )
}

function Toast({
  notification,
  onDismiss,
}: {
  notification: Notification
  onDismiss: () => void
}) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-3 pr-2',
        'bg-[var(--surface-panel)] border border-[var(--border-default)] border-l-4',
        BORDER_COLORS[notification.type],
        'rounded-[var(--radius-md)] shadow-lg',
        'animate-slide-up',
      )}
      role="alert"
    >
      <span className="shrink-0 mt-0.5">{ICONS[notification.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{notification.title}</p>
        {notification.message && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{notification.message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
