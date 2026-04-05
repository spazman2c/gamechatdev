'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus,
  Settings,
  Plus,
  FolderPlus,
  Bell,
  ShieldCheck,
  Pencil,
  Copy,
  ChevronDown,
  Check,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { openInviteModal } from '@/store/invite-modal'

interface HubMenuProps {
  hubId: string
  hubName: string
  isOwner: boolean
}

export function HubMenu({ hubId, hubName, isOwner }: HubMenuProps) {
  const [open, setOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  function action(fn: () => void) {
    return () => { setOpen(false); fn() }
  }

  function copyHubId() {
    navigator.clipboard.writeText(hubId).then(() => {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      {/* Trigger — hub name */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full px-3 py-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <h2 className="font-brand font-semibold text-sm text-[var(--text-primary)] truncate flex-1">
          {hubName}
        </h2>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute left-2 right-2 top-[calc(100%+2px)] z-50 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-xl overflow-hidden py-1.5"
        >
          {/* Server Boost */}
          <MenuItem
            icon={<Zap className="h-4 w-4" />}
            label="Server Boost"
            iconClassName="text-[var(--accent-secondary)]"
            onClick={action(() => {})}
          />

          <Divider />

          {/* Invite */}
          <MenuItem
            icon={<UserPlus className="h-4 w-4" />}
            label="Invite to Server"
            onClick={action(() => openInviteModal(hubId, hubName))}
          />

          {/* Settings — owner only */}
          {isOwner && (
            <MenuItem
              icon={<Settings className="h-4 w-4" />}
              label="Server Settings"
              onClick={action(() => router.push(`/app/hub/${hubId}/settings`))}
            />
          )}

          {/* Create Channel — owner only */}
          {isOwner && (
            <MenuItem
              icon={<Plus className="h-4 w-4" />}
              label="Create Channel"
              onClick={action(() => {
                window.dispatchEvent(new CustomEvent('hub:create-channel', { detail: { hubId } }))
              })}
            />
          )}

          {/* Create Category — owner only */}
          {isOwner && (
            <MenuItem
              icon={<FolderPlus className="h-4 w-4" />}
              label="Create Category"
              onClick={action(() => {
                window.dispatchEvent(new CustomEvent('hub:create-category', { detail: { hubId } }))
              })}
            />
          )}

          <Divider />

          {/* Notification Settings */}
          <MenuItem
            icon={<Bell className="h-4 w-4" />}
            label="Notification Settings"
            onClick={action(() => {})}
          />

          {/* Privacy Settings */}
          <MenuItem
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Privacy Settings"
            onClick={action(() => {})}
          />

          <Divider />

          {/* Edit Per-server Profile */}
          <MenuItem
            icon={<Pencil className="h-4 w-4" />}
            label="Edit Per-server Profile"
            onClick={action(() => {})}
          />

          {/* Copy Server ID */}
          <MenuItem
            icon={copiedId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            label={copiedId ? 'Copied!' : 'Copy Server ID'}
            onClick={copyHubId}
          />
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  iconClassName,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  iconClassName?: string
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 text-sm transition-colors',
        danger
          ? 'text-[var(--functional-error)] hover:bg-[var(--functional-error)] hover:text-white'
          : 'text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white',
      )}
    >
      <span>{label}</span>
      <span className={cn('opacity-70', iconClassName, danger && 'opacity-100')}>{icon}</span>
    </button>
  )
}

function Divider() {
  return <div className="h-px bg-[var(--border-subtle)] my-1 mx-2" />
}
