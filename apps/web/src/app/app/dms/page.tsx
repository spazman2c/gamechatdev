'use client'

import { MessageSquare } from 'lucide-react'

export default function DMsPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <MessageSquare className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
        <h2 className="font-brand text-xl font-semibold text-[var(--text-primary)] mb-2">
          Direct Messages
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Select a conversation from the list, or start a new one.
        </p>
      </div>
    </div>
  )
}
