'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { User, Bell, Palette, ShieldCheck, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UpdateProfileSchema, type UpdateProfileInput } from '@nexora/schemas'
import { Button } from '@nexora/ui/button'
import { Input } from '@nexora/ui/input'
import { Avatar } from '@nexora/ui/avatar'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { PublicUser } from '@nexora/types'
import { useAuthStore } from '@/store/auth'
import { notify } from '@/store/notifications'
import { useTheme } from 'next-themes'

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: <User className="h-4 w-4" /> },
  { id: 'appearance',    label: 'Appearance',     icon: <Palette className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell className="h-4 w-4" /> },
  { id: 'privacy',       label: 'Privacy',        icon: <ShieldCheck className="h-4 w-4" /> },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const router = useRouter()
  const { clearAuth } = useAuthStore()

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => null)
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Settings sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-[var(--surface-raised)] border-r border-[var(--border-subtle)] py-4 px-2 gap-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          User Settings
        </p>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-xs)] text-sm transition-colors w-full text-left',
              activeTab === tab.id
                ? 'bg-[var(--surface-active)] text-[var(--text-primary)] font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-xs)] text-sm text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)] transition-colors w-full text-left"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Settings content */}
      <main className="flex-1 overflow-y-auto p-8 max-w-2xl">
        {activeTab === 'profile'       && <ProfileSettings />}
        {activeTab === 'appearance'    && <AppearanceSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'privacy'       && <PrivacySettings />}
      </main>
    </div>
  )
}

function ProfileSettings() {
  const { user, updateUser } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      bio: user?.bio ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileInput) => api.patch('/users/me', data),
    onSuccess: (res) => {
      updateUser(res.data as Partial<PublicUser>)
      notify.success('Profile updated!')
    },
    onError: () => notify.error('Failed to save profile'),
  })

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Profile</h2>

      <div className="flex items-center gap-4 mb-8 p-4 bg-[var(--surface-panel)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
        <Avatar
          src={user?.avatarUrl ?? undefined}
          fallback={user?.displayName ?? user?.username ?? '?'}
          size="xl"
        />
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            {user?.displayName ?? user?.username}
          </p>
          <p className="text-sm text-[var(--text-muted)]">@{user?.username}</p>
          <button className="mt-2 text-xs text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors">
            Change avatar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-5">
        <Input
          label="Display name"
          placeholder="Your display name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Bio
          </label>
          <textarea
            placeholder="Tell people a bit about yourself…"
            rows={3}
            className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] resize-none transition-colors"
            {...register('bio')}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty} loading={mutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Appearance</h2>

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-[var(--text-secondary)]">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                'px-4 py-3 rounded-[var(--radius-md)] border text-sm font-medium capitalize transition-all',
                theme === t
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Notifications</h2>
      <div className="flex flex-col gap-4">
        {[
          { label: 'Direct messages', desc: 'Notify me when I receive a DM' },
          { label: 'Mentions', desc: 'Notify me when someone @mentions me' },
          { label: 'Hub activity', desc: 'Notify me about activity in my hubs' },
          { label: 'Sound effects', desc: 'Play sounds for notifications and room events' },
        ].map((item) => (
          <ToggleSetting key={item.label} label={item.label} description={item.desc} defaultChecked />
        ))}
      </div>
    </div>
  )
}

function PrivacySettings() {
  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Privacy & Safety</h2>
      <div className="flex flex-col gap-4">
        {[
          { label: 'Allow DMs from hub members', desc: 'Let members of shared hubs send you DMs', defaultChecked: true },
          { label: 'Show my presence to others', desc: 'Let people see your current presence status', defaultChecked: true },
          { label: 'Allow catch-up summaries', desc: 'Let Nexora generate AI summaries of channels you\'ve missed', defaultChecked: true },
        ].map((item) => (
          <ToggleSetting
            key={item.label}
            label={item.label}
            description={item.desc}
            defaultChecked={item.defaultChecked}
          />
        ))}
      </div>
    </div>
  )
}

function ToggleSetting({
  label,
  description,
  defaultChecked = false,
}: {
  label: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 shrink-0 accent-[var(--accent-primary)] rounded cursor-pointer"
      />
    </div>
  )
}
