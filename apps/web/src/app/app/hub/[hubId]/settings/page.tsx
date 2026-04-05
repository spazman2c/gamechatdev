'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Settings,
  Tag,
  Zap,
  Sparkles,
  Smile,
  Sticker,
  Music2,
  Users,
  Shield,
  Link,
  Lock,
  ShieldCheck,
  ClipboardList,
  Ban,
  Bot,
  Globe,
  FileCode2,
  Trash2,
  ChevronLeft,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHubStore } from '@/store/hub'
import { useAuthStore } from '@/store/auth'

import { ServerProfileTab }    from './_components/server-profile-tab'
import { MembersTab }          from './_components/members-tab'
import { RolesTab }            from './_components/roles-tab'
import { InvitesTab }          from './_components/invites-tab'
import { EmojiTab }            from './_components/emoji-tab'
import { StickersTab }         from './_components/stickers-tab'
import { AccessTab }           from './_components/access-tab'
import { SafetyTab }           from './_components/safety-tab'
import { AuditLogTab }         from './_components/audit-log-tab'
import { BansTab }             from './_components/bans-tab'
import { AutoModTab }          from './_components/automod-tab'
import { EnableCommunityTab }  from './_components/enable-community-tab'
import { EngagementTab }       from './_components/engagement-tab'
import { DeleteServerTab }     from './_components/delete-server-tab'

const SECTIONS = [
  {
    label: 'General',
    items: [
      { id: 'server-profile', label: 'Server Profile',   icon: Settings },
      { id: 'server-tag',     label: 'Server Tag',       icon: Tag },
      { id: 'engagement',     label: 'Engagement',       icon: Hash },
      { id: 'boost-perks',   label: 'Boost Perks',      icon: Zap },
    ],
  },
  {
    label: 'Assets',
    items: [
      { id: 'emoji',       label: 'Emoji',      icon: Smile },
      { id: 'stickers',    label: 'Stickers',   icon: Sticker },
      { id: 'soundboard',  label: 'Soundboard', icon: Music2 },
    ],
  },
  {
    label: 'User Management',
    items: [
      { id: 'members', label: 'Members', icon: Users },
      { id: 'roles',   label: 'Roles',   icon: Shield },
    ],
  },
  {
    label: 'Community',
    items: [
      { id: 'invites', label: 'Invites', icon: Link },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'access',  label: 'Access',       icon: Lock },
      { id: 'safety',  label: 'Safety Setup', icon: ShieldCheck },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { id: 'audit-log', label: 'Audit Log', icon: ClipboardList },
      { id: 'bans',      label: 'Bans',      icon: Ban },
      { id: 'automod',   label: 'AutoMod',   icon: Bot },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { id: 'community',        label: 'Enable Community', icon: Globe },
      { id: 'server-template',  label: 'Server Template',  icon: FileCode2 },
      { id: 'delete-server',    label: 'Delete Server',    icon: Trash2, danger: true },
    ],
  },
] as const

type TabId = (typeof SECTIONS)[number]['items'][number]['id']

function BoostPerksTab() {
  const TIERS = [
    { level: 1, boosts: 2,  perks: ['Animated server icon', '50 emoji slots', 'Custom invite link', '128 Kbps audio'] },
    { level: 2, boosts: 7,  perks: ['Server banner', '100 emoji slots', '256 Kbps audio', '50MB file uploads'] },
    { level: 3, boosts: 14, perks: ['Vanity URL', '250 emoji slots', '100 soundboard slots', '500MB file uploads'] },
  ]
  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-2">Boost Perks</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">Unlock perks for your server by boosting it.</p>
      <div className="flex flex-col gap-4">
        {TIERS.map((tier) => (
          <div key={tier.level} className="p-4 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-[var(--accent-secondary)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Level {tier.level}</span>
              <span className="text-xs text-[var(--text-muted)]">— {tier.boosts} boosts required</span>
            </div>
            <ul className="flex flex-col gap-1">
              {tier.perks.map((p) => (
                <li key={p} className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[var(--accent-secondary)]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function ServerTagTab() {
  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-2">Server Tag</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Create a unique tag to represent your server. Tags appear next to member names in DMs and other servers.
      </p>
      <div className="p-6 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-center">
        <Sparkles className="h-10 w-10 text-[var(--text-muted)] opacity-30 mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)]">Server tags are available with a Level 1 boost or higher.</p>
      </div>
    </div>
  )
}

function SoundboardTab() {
  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-2">Soundboard</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">Upload custom sounds members can play in voice channels.</p>
      <div className="p-6 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-center">
        <Music2 className="h-10 w-10 text-[var(--text-muted)] opacity-30 mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)]">Soundboard upload is coming soon. You get 8 free slots.</p>
      </div>
    </div>
  )
}

function ServerTemplateTab() {
  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-2">Server Template</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Create a template from your server so others can use the same structure.
      </p>
      <div className="p-6 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-center">
        <FileCode2 className="h-10 w-10 text-[var(--text-muted)] opacity-30 mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)]">Server templates are coming soon.</p>
      </div>
    </div>
  )
}

export default function HubSettingsPage() {
  const { hubId } = useParams<{ hubId: string }>()
  const [activeTab, setActiveTab] = useState<TabId>('server-profile')
  const router = useRouter()
  const { hub } = useHubStore()
  const { user } = useAuthStore()
  const isOwner = hub?.ownerId === user?.id

  function renderTab() {
    switch (activeTab) {
      case 'server-profile':   return <ServerProfileTab hubId={hubId} hub={hub} />
      case 'server-tag':       return <ServerTagTab />
      case 'engagement':       return <EngagementTab hubId={hubId} hub={hub} />
      case 'boost-perks':     return <BoostPerksTab />
      case 'emoji':            return <EmojiTab hubId={hubId} />
      case 'stickers':         return <StickersTab hubId={hubId} />
      case 'soundboard':       return <SoundboardTab />
      case 'members':          return <MembersTab hubId={hubId} ownerId={hub?.ownerId ?? ''} />
      case 'roles':            return <RolesTab hubId={hubId} />
      case 'invites':          return <InvitesTab hubId={hubId} />
      case 'access':           return <AccessTab hubId={hubId} hub={hub} />
      case 'safety':           return <SafetyTab hubId={hubId} hub={hub} />
      case 'audit-log':        return <AuditLogTab hubId={hubId} />
      case 'bans':             return <BansTab hubId={hubId} />
      case 'automod':          return <AutoModTab hubId={hubId} />
      case 'community':        return <EnableCommunityTab hubId={hubId} hub={hub} />
      case 'server-template':  return <ServerTemplateTab />
      case 'delete-server':    return <DeleteServerTab hubId={hubId} hubName={hub?.name ?? ''} />
      default:                 return null
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-[var(--surface-raised)] border-r border-[var(--border-subtle)] overflow-y-auto py-4 px-2">
        <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] truncate">
          {hub?.name ?? 'Server'} Settings
        </p>

        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon
              const isDanger = 'danger' in item && item.danger
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabId)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-xs)] text-sm transition-colors w-full text-left',
                    activeTab === item.id
                      ? isDanger
                        ? 'bg-[var(--functional-error-bg)] text-[var(--functional-error)] font-medium'
                        : 'bg-[var(--surface-active)] text-[var(--text-primary)] font-medium'
                      : isDanger
                        ? 'text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
                  )}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}

        <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => router.push(`/app/hub/${hubId}`)}
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-xs)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors w-full"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to server
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn('flex-1 overflow-hidden', activeTab === 'roles' ? 'flex flex-col' : 'overflow-y-auto')}>
        {activeTab === 'roles' ? (
          <div className="flex flex-col h-full px-8 py-8">
            <RolesTab hubId={hubId} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-8 py-8">
            {renderTab()}
          </div>
        )}
      </main>
    </div>
  )
}
