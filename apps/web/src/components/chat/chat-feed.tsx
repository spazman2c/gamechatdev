'use client'

import { useEffect, useRef, useCallback } from 'react'
import { formatMessageTime, formatDateDivider } from '@/lib/utils'
import { useMessagesStore } from '@/store/messages'
import { useAuthStore } from '@/store/auth'
import { MessageBubble } from './message-bubble'
import { SkeletonMessage } from '@nexora/ui/skeleton'
import type { Message } from '@nexora/types'

const EMPTY_MESSAGES: Message[] = []
const EMPTY_TYPING: { userId: string; username: string }[] = []

interface ChatFeedProps {
  channelId: string
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

export function ChatFeed({ channelId, isLoading, hasMore, onLoadMore }: ChatFeedProps) {
  const messages = useMessagesStore((s) => s.channels[channelId] ?? EMPTY_MESSAGES)
  const typingUsers = useMessagesStore((s) => s.typingUsers[channelId] ?? EMPTY_TYPING)
  const { user } = useAuthStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  // Scroll to bottom on new messages from self, or on initial load
  useEffect(() => {
    const newLength = messages.length
    const prevLength = prevLengthRef.current

    if (prevLength === 0 || newLength > prevLength) {
      const lastMsg = messages[messages.length - 1]
      const isMine = lastMsg?.author?.id === user?.id
      const isNearBottom = (() => {
        const el = containerRef.current
        if (!el) { return true }
        return el.scrollHeight - el.scrollTop - el.clientHeight < 200
      })()

      if (isMine || isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: prevLength === 0 ? 'instant' : 'smooth' })
      }
    }
    prevLengthRef.current = newLength
  }, [messages, user?.id])

  // Intersection observer for load-more at top
  const topSentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore) { return }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(topSentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 overflow-y-auto px-0 py-2 scrollbar-thin"
      role="log"
      aria-label="Messages"
      aria-live="polite"
      aria-relevant="additions"
    >
      {/* Load more sentinel */}
      {hasMore && <div ref={topSentinelRef} className="h-1" />}

      {/* Skeletons while loading */}
      {isLoading && (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonMessage key={i} />)}
        </div>
      )}

      {/* Messages with date dividers */}
      {!isLoading && messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--text-muted)]">No messages yet. Say hello!</p>
        </div>
      )}

      {renderWithDividers(messages, user?.id ?? '')}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1 text-xs text-[var(--text-muted)]" aria-live="polite">
          <TypingDots />
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]?.username} is typing…`
              : typingUsers.length === 2
                ? `${typingUsers[0]?.username} and ${typingUsers[1]?.username} are typing…`
                : 'Several people are typing…'}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

function renderWithDividers(messages: Message[], myId: string) {
  const elements: React.ReactNode[] = []
  let lastDate = ''
  let lastAuthorId = ''
  let lastTimestamp = 0

  messages.forEach((msg, i) => {
    const msgDate = formatDateDivider(msg.createdAt)
    const msgTime = new Date(msg.createdAt).getTime()
    const groupBreak = msgTime - lastTimestamp > 5 * 60 * 1000 // 5 min gap

    if (msgDate !== lastDate) {
      lastDate = msgDate
      lastAuthorId = ''
      elements.push(
        <DateDivider key={`divider-${msg.id}`} label={msgDate} />,
      )
    }

    const isGrouped = !groupBreak && msg.author?.id === lastAuthorId
    lastAuthorId = msg.author?.id ?? ''
    lastTimestamp = msgTime

    elements.push(
      <MessageBubble
        key={msg.id}
        message={msg}
        isOwn={msg.author?.id === myId}
        grouped={isGrouped}
      />,
    )
  })

  return elements
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 my-3" role="separator" aria-label={label}>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] animate-pulse-soft"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}
