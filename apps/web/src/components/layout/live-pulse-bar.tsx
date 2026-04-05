'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PulseItem {
  id: string
  type: 'room_active' | 'mention' | 'event' | 'welcome_request'
  label: string
  href?: string
}

export function LivePulseBar() {
  const [items, setItems] = useState<PulseItem[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  // In Phase 2 this will be populated from WebSocket events
  // For now renders empty (or hidden when empty)
  if (items.length === 0) { return null }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 border-b border-[var(--border-subtle)]',
        'bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs',
        'transition-all duration-normal',
        isCollapsed ? 'h-0 overflow-hidden py-0' : 'h-9',
      )}
      role="status"
      aria-label="Live activity"
    >
      <span className="flex items-center gap-1.5 text-[var(--accent-secondary)] font-medium shrink-0">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--accent-secondary)] animate-pulse-soft"
          aria-hidden="true"
        />
        Live
      </span>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1">
        {items.map((item) => (
          <button
            key={item.id}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--surface-panel)] hover:bg-[var(--surface-active)] transition-colors whitespace-nowrap"
          >
            {item.label}
            <span
              onClick={(e) => {
                e.stopPropagation()
                setItems((prev) => prev.filter((i) => i.id !== item.id))
              }}
              className="opacity-50 hover:opacity-100 ml-1"
              role="button"
              tabIndex={0}
              aria-label={`Dismiss: ${item.label}`}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setIsCollapsed(true)}
        className="p-1 rounded hover:bg-[var(--surface-hover)] transition-colors shrink-0"
        aria-label="Collapse pulse bar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
