'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot, Plus, Trash2, ChevronDown, ChevronRight, Shield,
  AlertTriangle, Hash, X, Check, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'
import { useHubStore } from '@/store/hub'

// ── Types ──────────────────────────────────────────────────────────────────

type RuleType = 'blocked_words' | 'spam' | 'mention_spam' | 'link_filter' | 'mass_caps' | 'duplicate' | 'new_account'
type RuleAction = 'delete' | 'delete_warn' | 'timeout' | 'kick' | 'ban'

interface AutomodRule {
  id: string
  hubId: string
  name: string
  type: RuleType
  enabled: boolean
  action: RuleAction
  timeoutMinutes: number
  exemptRoleIds: string[]
  exemptChannelIds: string[]
  config: Record<string, unknown>
  createdAt: string
}

interface AutomodSettings {
  hubId: string
  enabled: boolean
  logChannelId: string | null
}

// ── Rule metadata ──────────────────────────────────────────────────────────

const RULE_TYPES: { type: RuleType; label: string; description: string }[] = [
  { type: 'blocked_words',  label: 'Blocked Words',   description: 'Remove messages containing specific words or patterns' },
  { type: 'spam',           label: 'Message Spam',    description: 'Limit how many messages a user can send in a short period' },
  { type: 'mention_spam',   label: 'Mention Spam',    description: 'Block messages that mention too many users at once' },
  { type: 'link_filter',    label: 'Link Filter',     description: 'Control which links members are allowed to post' },
  { type: 'mass_caps',      label: 'Excessive Caps',  description: 'Remove messages that are mostly uppercase letters' },
  { type: 'duplicate',      label: 'Duplicate Messages', description: 'Prevent users from sending the same message repeatedly' },
  { type: 'new_account',    label: 'New Account',     description: 'Restrict messages from recently created accounts' },
]

const ACTION_LABELS: Record<RuleAction, string> = {
  delete:       'Delete message',
  delete_warn:  'Delete + warn user',
  timeout:      'Delete + timeout',
  kick:         'Delete + kick',
  ban:          'Delete + ban',
}

const ACTION_COLORS: Record<RuleAction, string> = {
  delete:       'text-[var(--text-muted)]',
  delete_warn:  'text-[var(--functional-warning)]',
  timeout:      'text-[var(--accent-secondary)]',
  kick:         'text-[var(--functional-error)]',
  ban:          'text-[var(--functional-error)]',
}

// ── Default configs per type ───────────────────────────────────────────────

function defaultConfig(type: RuleType): Record<string, unknown> {
  switch (type) {
    case 'blocked_words':  return { words: [], use_regex: false }
    case 'spam':           return { max_messages: 5, interval_seconds: 5 }
    case 'mention_spam':   return { max_mentions: 5 }
    case 'link_filter':    return { mode: 'block_all', domains: [] }
    case 'mass_caps':      return { min_length: 10, percent: 70 }
    case 'duplicate':      return { timeframe_seconds: 30, max_duplicates: 3 }
    case 'new_account':    return { min_age_days: 7 }
  }
}

// ── Shared UI components ───────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative shrink-0 h-5 w-9 rounded-full transition-colors',
        checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
      )}
    >
      <span className={cn(
        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0.5',
      )} />
    </button>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
      {children}
    </label>
  )
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n)) { onChange(n) }
        }}
        className="w-24 px-2.5 py-1.5 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
      />
      {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
    </div>
  )
}

function TagsInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setInput('')
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder ?? 'Type and press Enter'}
          className="flex-1 px-2.5 py-1.5 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          className="px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-primary)] text-white text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 px-2 py-0.5 bg-[var(--surface-active)] rounded-full text-xs text-[var(--text-primary)] font-mono"
            >
              {v}
              <button
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-[var(--text-muted)] hover:text-[var(--functional-error)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Rule config editors ────────────────────────────────────────────────────

function ConfigEditor({
  type,
  config,
  onChange,
}: {
  type: RuleType
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}) {
  function set(key: string, value: unknown) {
    onChange({ ...config, [key]: value })
  }

  switch (type) {
    case 'blocked_words':
      return (
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>Blocked words / phrases</FieldLabel>
            <TagsInput
              values={(config.words as string[]) ?? []}
              onChange={(v) => set('words', v)}
              placeholder="Type a word and press Enter"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Use regex patterns</p>
              <p className="text-xs text-[var(--text-muted)]">Treat each entry as a regular expression</p>
            </div>
            <Toggle
              checked={(config.use_regex as boolean) ?? false}
              onChange={(v) => set('use_regex', v)}
            />
          </div>
        </div>
      )

    case 'spam':
      return (
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>Max messages</FieldLabel>
            <NumberInput
              value={(config.max_messages as number) ?? 5}
              onChange={(v) => set('max_messages', v)}
              min={2}
              max={100}
              suffix="messages"
            />
          </div>
          <div>
            <FieldLabel>Time window</FieldLabel>
            <NumberInput
              value={(config.interval_seconds as number) ?? 5}
              onChange={(v) => set('interval_seconds', v)}
              min={1}
              max={3600}
              suffix="seconds"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            If a user sends more than {(config.max_messages as number) ?? 5} messages in {(config.interval_seconds as number) ?? 5} seconds, the rule triggers.
          </p>
        </div>
      )

    case 'mention_spam':
      return (
        <div>
          <FieldLabel>Max mentions per message</FieldLabel>
          <NumberInput
            value={(config.max_mentions as number) ?? 5}
            onChange={(v) => set('max_mentions', v)}
            min={1}
            max={50}
            suffix="mentions"
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Unique @mentions in a single message above this number will trigger the rule.
          </p>
        </div>
      )

    case 'link_filter': {
      const mode = (config.mode as string) ?? 'block_all'
      const domains = (config.domains as string[]) ?? []
      return (
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>Filter mode</FieldLabel>
            <div className="flex flex-col gap-1.5">
              {[
                { value: 'block_all', label: 'Block all links', desc: 'Remove any message containing a URL' },
                { value: 'block_list', label: 'Block specific domains', desc: 'Only block links to specific domains' },
                { value: 'allow_list', label: 'Allow specific domains only', desc: 'Block all links except to approved domains' },
              ].map((option) => (
                <label key={option.value} className="flex items-start gap-2.5 cursor-pointer group">
                  <div className={cn(
                    'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                    mode === option.value
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                      : 'border-[var(--border-default)] group-hover:border-[var(--accent-primary)]',
                  )}>
                    {mode === option.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div onClick={() => set('mode', option.value)}>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{option.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {mode !== 'block_all' && (
            <div>
              <FieldLabel>
                {mode === 'allow_list' ? 'Allowed domains' : 'Blocked domains'}
              </FieldLabel>
              <TagsInput
                values={domains}
                onChange={(v) => set('domains', v)}
                placeholder="e.g. youtube.com"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1.5">Enter domain names without http:// or www.</p>
            </div>
          )}
        </div>
      )
    }

    case 'mass_caps':
      return (
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>Minimum message length</FieldLabel>
            <NumberInput
              value={(config.min_length as number) ?? 10}
              onChange={(v) => set('min_length', v)}
              min={1}
              max={2000}
              suffix="characters"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Only check messages with at least this many letters.</p>
          </div>
          <div>
            <FieldLabel>Caps threshold</FieldLabel>
            <NumberInput
              value={(config.percent as number) ?? 70}
              onChange={(v) => set('percent', Math.min(100, Math.max(1, v)))}
              min={1}
              max={100}
              suffix="% uppercase"
            />
          </div>
        </div>
      )

    case 'duplicate':
      return (
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel>Max duplicates allowed</FieldLabel>
            <NumberInput
              value={(config.max_duplicates as number) ?? 3}
              onChange={(v) => set('max_duplicates', v)}
              min={1}
              max={20}
              suffix="times"
            />
          </div>
          <div>
            <FieldLabel>Time window</FieldLabel>
            <NumberInput
              value={(config.timeframe_seconds as number) ?? 30}
              onChange={(v) => set('timeframe_seconds', v)}
              min={5}
              max={3600}
              suffix="seconds"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            If the same message is sent more than {(config.max_duplicates as number) ?? 3} times in {(config.timeframe_seconds as number) ?? 30} seconds, the rule triggers.
          </p>
        </div>
      )

    case 'new_account':
      return (
        <div>
          <FieldLabel>Minimum account age</FieldLabel>
          <NumberInput
            value={(config.min_age_days as number) ?? 7}
            onChange={(v) => set('min_age_days', v)}
            min={0}
            max={365}
            suffix="days"
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Accounts newer than this will have their messages blocked.
          </p>
        </div>
      )
  }
}

// ── Add / Edit Rule Modal ──────────────────────────────────────────────────

function RuleModal({
  hubId,
  initial,
  onClose,
  onSaved,
}: {
  hubId: string
  initial?: AutomodRule | undefined
  onClose: () => void
  onSaved: () => void
}) {
  const { channels } = useHubStore()
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<RuleType>(initial?.type ?? 'blocked_words')
  const [action, setAction] = useState<RuleAction>(initial?.action ?? 'delete')
  const [timeoutMinutes, setTimeoutMinutes] = useState(initial?.timeoutMinutes ?? 10)
  const [config, setConfig] = useState<Record<string, unknown>>(
    initial?.config ?? defaultConfig('blocked_words'),
  )
  const [exemptChannelIds, setExemptChannelIds] = useState<string[]>(initial?.exemptChannelIds ?? [])

  // When type changes, reset config to defaults
  function changeType(t: RuleType) {
    setType(t)
    setConfig(defaultConfig(t))
    if (!initial) {
      const meta = RULE_TYPES.find((r) => r.type === t)
      if (meta) { setName(meta.label) }
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body = { name: name.trim() || RULE_TYPES.find((r) => r.type === type)?.label, type, action, timeoutMinutes, config, exemptChannelIds, exemptRoleIds: initial?.exemptRoleIds ?? [] }
      if (initial) {
        return api.patch(`/hubs/${hubId}/automod/rules/${initial.id}`, body)
      }
      return api.post(`/hubs/${hubId}/automod/rules`, body)
    },
    onSuccess: () => {
      onSaved()
      onClose()
    },
    onError: () => notify.error(initial ? 'Failed to save rule' : 'Failed to create rule'),
  })

  const textChannels = channels.filter((c) => c.type === 'text' || c.type === 'announcement')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg bg-[var(--surface-raised)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <h3 className="font-brand font-bold text-base text-[var(--text-primary)]">
            {initial ? 'Edit Rule' : 'Create AutoMod Rule'}
          </h3>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-5">
          {/* Rule type */}
          <div>
            <FieldLabel>Rule Type</FieldLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {RULE_TYPES.map((rt) => (
                <button
                  key={rt.type}
                  onClick={() => changeType(rt.type)}
                  className={cn(
                    'text-left px-3 py-2 rounded-[var(--radius-sm)] border text-sm transition-colors',
                    type === rt.type
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]',
                  )}
                >
                  <span className="font-medium block">{rt.label}</span>
                  <span className="text-[11px] opacity-70 block leading-snug mt-0.5">{rt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rule name */}
          <div>
            <FieldLabel>Rule Name</FieldLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={RULE_TYPES.find((r) => r.type === type)?.label}
              className="w-full px-3 py-2 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* Type-specific config */}
          <div className="p-4 bg-[var(--surface-panel)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <ConfigEditor type={type} config={config} onChange={setConfig} />
          </div>

          {/* Action */}
          <div>
            <FieldLabel>Action</FieldLabel>
            <div className="flex flex-col gap-1">
              {(Object.keys(ACTION_LABELS) as RuleAction[]).map((a) => (
                <label key={a} className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors">
                  <div className={cn(
                    'h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                    action === a ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--border-default)]',
                  )}>
                    {action === a && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div onClick={() => setAction(a)}>
                    <span className={cn('text-sm font-medium', ACTION_COLORS[a])}>{ACTION_LABELS[a]}</span>
                    {a === 'ban' || a === 'kick' ? (
                      <span className="ml-2 text-[10px] text-[var(--functional-error)] opacity-70">destructive</span>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
            {action === 'timeout' && (
              <div className="mt-3 ml-7">
                <FieldLabel>Timeout duration</FieldLabel>
                <NumberInput
                  value={timeoutMinutes}
                  onChange={setTimeoutMinutes}
                  min={1}
                  max={10080}
                  suffix="minutes"
                />
              </div>
            )}
          </div>

          {/* Exempt channels */}
          {textChannels.length > 0 && (
            <div>
              <FieldLabel>Exempt Channels</FieldLabel>
              <p className="text-xs text-[var(--text-muted)] mb-2">This rule will not apply in these channels.</p>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {textChannels.map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors">
                    <div
                      onClick={() => setExemptChannelIds((prev) =>
                        prev.includes(ch.id) ? prev.filter((id) => id !== ch.id) : [...prev, ch.id]
                      )}
                      className={cn(
                        'h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                        exemptChannelIds.includes(ch.id)
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                          : 'border-[var(--border-default)]',
                      )}
                    >
                      {exemptChannelIds.includes(ch.id) && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-secondary)]">{ch.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-subtle)] shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {initial ? 'Save Changes' : 'Create Rule'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Rule card ──────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  hubId,
  onEdit,
  onDelete,
}: {
  rule: AutomodRule
  hubId: string
  onEdit: () => void
  onDelete: () => void
}) {
  const queryClient = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: () =>
      api.patch(`/hubs/${hubId}/automod/rules/${rule.id}`, { enabled: !rule.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automod', hubId] }),
    onError: () => notify.error('Failed to toggle rule'),
  })

  const meta = RULE_TYPES.find((r) => r.type === rule.type)

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3.5 bg-[var(--surface-panel)] border rounded-[var(--radius-md)] transition-colors',
      rule.enabled ? 'border-[var(--border-subtle)]' : 'border-[var(--border-subtle)] opacity-60',
    )}>
      {/* Type icon */}
      <div className={cn(
        'h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 text-xs font-bold',
        rule.enabled ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]' : 'bg-[var(--surface-active)] text-[var(--text-muted)]',
      )}>
        <Shield className="h-4 w-4" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{rule.name}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-active)] text-[var(--text-muted)]">
            {meta?.label ?? rule.type}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className={cn('text-xs', ACTION_COLORS[rule.action])}>
            {ACTION_LABELS[rule.action]}
            {rule.action === 'timeout' ? ` (${rule.timeoutMinutes}min)` : ''}
          </span>
          {rule.exemptChannelIds.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">
              {rule.exemptChannelIds.length} exempt channel{rule.exemptChannelIds.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="h-7 w-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          title="Edit rule"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="h-7 w-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)] transition-colors"
          title="Delete rule"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <Toggle checked={rule.enabled} onChange={() => toggleMutation.mutate()} />
      </div>
    </div>
  )
}

// ── Main AutoModTab ────────────────────────────────────────────────────────

export function AutoModTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const { channels } = useHubStore()
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomodRule | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['automod', hubId],
    queryFn: () =>
      api.get<{ settings: AutomodSettings; rules: AutomodRule[] }>(`/hubs/${hubId}/automod`)
        .then((r) => r.data),
  })

  const settings = data?.settings
  const rules = data?.rules ?? []

  const settingsMutation = useMutation({
    mutationFn: (patch: Partial<AutomodSettings>) =>
      api.patch(`/hubs/${hubId}/automod`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automod', hubId] }),
    onError: () => notify.error('Failed to update settings'),
  })

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => api.delete(`/hubs/${hubId}/automod/rules/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod', hubId] })
      notify.success('Rule deleted')
    },
    onError: () => notify.error('Failed to delete rule'),
  })

  const textChannels = channels.filter((c) => c.type === 'text' || c.type === 'announcement')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">AutoMod</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Automatically moderate content in your server to keep it safe.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditingRule(null); setShowModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Rule
        </Button>
      </div>

      {/* Master toggle */}
      <div className={cn(
        'flex items-center justify-between px-4 py-4 rounded-[var(--radius-md)] border transition-colors',
        settings?.enabled
          ? 'bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/30'
          : 'bg-[var(--surface-panel)] border-[var(--border-subtle)]',
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center',
            settings?.enabled ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'bg-[var(--surface-active)] text-[var(--text-muted)]',
          )}>
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              AutoMod is {settings?.enabled ? 'enabled' : 'disabled'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {settings?.enabled
                ? `${rules.filter((r) => r.enabled).length} active rule${rules.filter((r) => r.enabled).length !== 1 ? 's' : ''} protecting this server`
                : 'Enable to start automatically moderating messages'}
            </p>
          </div>
        </div>
        <Toggle
          checked={settings?.enabled ?? false}
          onChange={(v) => settingsMutation.mutate({ enabled: v })}
        />
      </div>

      {/* Log channel */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Log Channel
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          AutoMod actions will be logged to this channel. Leave empty to disable logging.
        </p>
        <select
          value={settings?.logChannelId ?? ''}
          onChange={(e) => settingsMutation.mutate({ logChannelId: e.target.value || null })}
          className="w-full px-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="">— No log channel —</option>
          {textChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>#{ch.name}</option>
          ))}
        </select>
      </div>

      {/* Rules list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Rules ({rules.length})
          </label>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-[var(--radius-md)] bg-[var(--surface-panel)] animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-md)]">
            <Bot className="h-10 w-10 text-[var(--text-muted)] opacity-20 mb-3" />
            <p className="text-sm font-medium text-[var(--text-muted)]">No rules configured</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Add a rule to start protecting your server automatically.</p>
            <Button size="sm" variant="ghost" onClick={() => { setEditingRule(null); setShowModal(true) }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add your first rule
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                hubId={hubId}
                onEdit={() => { setEditingRule(rule); setShowModal(true) }}
                onDelete={() => deleteMutation.mutate(rule.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rule type reference */}
      {rules.length > 0 && (
        <div className="p-4 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-[var(--functional-warning)] shrink-0" />
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Rule Processing Order</p>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Rules are evaluated in the order they were created. The first matching rule applies and no further rules are checked. Disable or reorder rules to change priority. Members with the Manage Server permission or higher are exempt from all AutoMod rules.
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <RuleModal
          hubId={hubId}
          {...(editingRule ? { initial: editingRule } : {})}
          onClose={() => { setShowModal(false); setEditingRule(null) }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['automod', hubId] })}
        />
      )}
    </div>
  )
}
