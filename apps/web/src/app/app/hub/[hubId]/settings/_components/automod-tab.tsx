'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Bot } from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'

interface WordFilter {
  id: string
  word: string
  blockMessage: boolean
}

function ToggleCard({
  label,
  desc,
  enabled,
  onToggle,
  disabled,
}: {
  label: string
  desc: string
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-3 bg-[var(--surface-panel)] rounded-[var(--radius-sm)] border border-[var(--border-default)]',
      disabled && 'opacity-50',
    )}>
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
        )}
      >
        <span className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1',
        )} />
      </button>
    </div>
  )
}

export function AutoModTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const [newWord, setNewWord] = useState('')
  const [blockMessage, setBlockMessage] = useState(false)
  // Stub toggles — these would need their own DB columns to persist
  const [mentionSpam, setMentionSpam] = useState(false)
  const [spamContent, setSpamContent] = useState(false)
  const [sensitiveContent, setSensitiveContent] = useState(false)

  const { data } = useQuery({
    queryKey: ['word-filters', hubId],
    queryFn: () =>
      api.get<{ filters: WordFilter[] }>(`/hubs/${hubId}/word-filters`).then((r) => r.data.filters),
  })

  const addMutation = useMutation({
    mutationFn: () => api.post(`/hubs/${hubId}/word-filters`, { word: newWord.trim(), blockMessage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['word-filters', hubId] })
      setNewWord('')
      setBlockMessage(false)
      notify.success('Word filter added')
    },
    onError: () => notify.error('Failed to add word filter'),
  })

  const deleteMutation = useMutation({
    mutationFn: (filterId: string) => api.delete(`/hubs/${hubId}/word-filters/${filterId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['word-filters', hubId] }),
  })

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">AutoMod</h2>

      {/* Rules */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Rules</h3>
        <div className="flex flex-col gap-2">
          <ToggleCard
            label="Mention Spam"
            desc="Block messages that mention more than 4 users at once"
            enabled={mentionSpam}
            onToggle={() => setMentionSpam((v) => !v)}
          />
          <ToggleCard
            label="Spam Content"
            desc="Block repeated identical messages in quick succession"
            enabled={spamContent}
            onToggle={() => setSpamContent((v) => !v)}
          />
          <ToggleCard
            label="Flagged Words"
            desc="Block messages containing words from your custom filter list"
            enabled={true}
            onToggle={() => {}}
            disabled
          />
          <ToggleCard
            label="Sensitive Content"
            desc="Block NSFW images and content in non-NSFW channels"
            enabled={sensitiveContent}
            onToggle={() => setSensitiveContent((v) => !v)}
          />
        </div>
      </section>

      {/* Custom word filter */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Custom Word Filters</h3>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Filtered words are replaced with *** unless you choose to block the message entirely.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newWord.trim()) addMutation.mutate() }}
            placeholder="Add a word…"
            className="flex-1 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              checked={blockMessage}
              onChange={(e) => setBlockMessage(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent-primary)]"
            />
            Block msg
          </label>
          <Button
            size="sm"
            onClick={() => addMutation.mutate()}
            disabled={!newWord.trim()}
            loading={addMutation.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {(data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-[var(--text-muted)]">
            <Bot className="h-8 w-8 opacity-30" />
            <p className="text-sm">No custom filters yet.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data?.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-full text-xs"
              >
                <span className="text-[var(--text-primary)] font-mono">{filter.word}</span>
                {filter.blockMessage && (
                  <span className="text-[var(--functional-error)] text-[10px]">block</span>
                )}
                <button
                  onClick={() => deleteMutation.mutate(filter.id)}
                  className="text-[var(--text-muted)] hover:text-[var(--functional-error)] transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
