'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Hash, Megaphone, Users, Search, Bell, Pin } from 'lucide-react'
import { useHubStore } from '@/store/hub'
import { useAuthStore } from '@/store/auth'
import { useHubUI } from '@/store/hub-ui'
import { useNotificationCenter } from '@/store/notification-center'
import { useChannelMessages } from '@/hooks/use-channel-messages'
import { ChatFeed } from '@/components/chat/chat-feed'
import { MessageInput } from '@/components/chat/message-input'
import { cn } from '@/lib/utils'
import type { Message } from '@nexora/types'

export default function StreamPage() {
  const { channelId } = useParams<{ channelId: string }>()
  const { hub, channels } = useHubStore()
  const { user } = useAuthStore()
  const showMembers = useHubUI((s) => s.membersPanelByUser[user?.id ?? ''] ?? false)
  const toggleMembersAction = useHubUI((s) => s.toggleMembers)
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  const channel = channels.find((c) => c.id === channelId)
  const isAnnouncement = channel?.type === 'announcement'
  const isOwner = hub?.ownerId === user?.id
  const isReadOnly = isAnnouncement && !isOwner

  const clearMention = useNotificationCenter((s) => s.clearMention)
  useEffect(() => { clearMention(channelId) }, [channelId, clearMention])

  const { isLoading, hasNextPage, loadMore } = useChannelMessages(channelId)

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        {/* Left: icon + name + topic */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isAnnouncement
            ? <Megaphone className="h-4 w-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
            : <Hash className="h-4 w-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
          }
          <h1 className="font-semibold text-sm text-[var(--text-primary)] shrink-0">
            {channel?.name ?? 'stream'}
          </h1>
          {channel?.topic && (
            <>
              <div className="h-4 w-px bg-[var(--border-default)] mx-1 shrink-0" aria-hidden="true" />
              <p className="text-xs text-[var(--text-muted)] truncate">{channel.topic}</p>
            </>
          )}
        </div>

        {/* Right: toolbar */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarBtn label="Pinned Messages">
            <Pin className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            label={showMembers ? 'Hide Members' : 'Show Members'}
            active={showMembers}
            onClick={() => toggleMembersAction(user?.id ?? '')}
          >
            <Users className="h-4 w-4" />
          </ToolbarBtn>
          <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
          {/* Search bar */}
          <button
            className="flex items-center gap-2 h-7 px-2 rounded text-[var(--text-muted)] bg-[var(--surface-panel)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors text-xs"
            aria-label="Search messages"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[var(--text-muted)] text-xs hidden sm:block">Search</span>
          </button>
          <ToolbarBtn label="Notification Settings">
            <Bell className="h-4 w-4" />
          </ToolbarBtn>
        </div>
      </div>

      {/* Chat feed */}
      <ChatFeed
        channelId={channelId}
        isLoading={isLoading}
        hasMore={!!hasNextPage}
        onLoadMore={loadMore}
      />

      {/* Message input */}
      {isReadOnly ? (
        <div className="shrink-0 mx-4 mb-4 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--surface-panel)] border border-[var(--border-subtle)] text-sm text-[var(--text-muted)] text-center">
          This is an announcement channel — only hub owners can post here.
        </div>
      ) : (
        <MessageInput
          channelId={channelId}
          channelName={channel?.name ?? 'channel'}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      )}
    </div>
  )
}

function ToolbarBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded transition-colors',
        active
          ? 'text-[var(--text-primary)] bg-[var(--surface-active)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
      )}
    >
      {children}
    </button>
  )
}
