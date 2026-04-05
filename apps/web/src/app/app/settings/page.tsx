'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  User,
  Bell,
  Palette,
  ShieldCheck,
  LogOut,
  Mic,
  Accessibility,
  Globe,
  Keyboard,
  Eye,
  EyeOff,
  Camera,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  UpdateProfileSchema,
  UpdateUsernameSchema,
  UpdateEmailSchema,
  ChangePasswordSchema,
  type UpdateProfileInput,
  type UpdateUsernameInput,
  type UpdateEmailInput,
  type ChangePasswordInput,
} from '@nexora/schemas'
import { Button } from '@nexora/ui/button'
import { Input } from '@nexora/ui/input'
import { Avatar } from '@nexora/ui/avatar'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { PublicUser } from '@nexora/types'
import { useAuthStore } from '@/store/auth'
import { notify } from '@/store/notifications'
import { useTheme } from 'next-themes'

declare global {
  interface Window { __nexoraSoundsEnabled?: boolean }
}

// ── Sidebar structure ────────────────────────────────────────────────────
const SECTIONS = [
  {
    heading: 'User Settings',
    items: [
      { id: 'account',       label: 'My Account',       icon: <User className="h-4 w-4" /> },
      { id: 'profile',       label: 'Profile',          icon: <User className="h-4 w-4" /> },
      { id: 'privacy',       label: 'Privacy & Safety',  icon: <ShieldCheck className="h-4 w-4" /> },
    ],
  },
  {
    heading: 'App Settings',
    items: [
      { id: 'appearance',    label: 'Appearance',       icon: <Palette className="h-4 w-4" /> },
      { id: 'accessibility', label: 'Accessibility',    icon: <Accessibility className="h-4 w-4" /> },
      { id: 'voice',         label: 'Voice & Video',    icon: <Mic className="h-4 w-4" /> },
      { id: 'notifications', label: 'Notifications',    icon: <Bell className="h-4 w-4" /> },
      { id: 'keybinds',      label: 'Keybinds',         icon: <Keyboard className="h-4 w-4" /> },
      { id: 'language',      label: 'Language',         icon: <Globe className="h-4 w-4" /> },
    ],
  },
] as const

type TabId = (typeof SECTIONS)[number]['items'][number]['id']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('account')
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
      <aside className="w-56 shrink-0 flex flex-col bg-[var(--surface-raised)] border-r border-[var(--border-subtle)] py-4 px-2 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.heading} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {section.heading}
            </p>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-[var(--radius-xs)] text-sm transition-colors w-full text-left',
                  activeTab === item.id
                    ? 'bg-[var(--surface-active)] text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
                )}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
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
        {activeTab === 'account'       && <AccountSettings />}
        {activeTab === 'profile'       && <ProfileSettings />}
        {activeTab === 'privacy'       && <PrivacySettings />}
        {activeTab === 'appearance'    && <AppearanceSettings />}
        {activeTab === 'accessibility' && <AccessibilitySettings />}
        {activeTab === 'voice'         && <VoiceVideoSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'keybinds'      && <KeybindSettings />}
        {activeTab === 'language'      && <LanguageSettings />}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// My Account — Discord-style card with display name, username, email, password
// ═══════════════════════════════════════════════════════════════════════════

function AccountSettings() {
  const { user, updateUser } = useAuthStore()
  const [editingField, setEditingField] = useState<string | null>(null)

  // Fetch full user (incl. email) from /me
  const { data: fullUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await api.get('/users/me')
      return res.data as PublicUser & { email?: string; createdAt?: string }
    },
  })

  const maskedEmail = fullUser?.email
    ? fullUser.email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : '***@***.com'

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">My Account</h2>

      {/* Profile card */}
      <div className="rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-subtle)]">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary,#7C5CFF)]" />

        {/* User info area */}
        <div className="bg-[var(--surface-panel)] p-4 pt-0">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="relative">
              <Avatar
                src={user?.avatarUrl ?? undefined}
                fallback={user?.displayName ?? user?.username ?? '?'}
                size="xl"
                className="ring-4 ring-[var(--surface-panel)]"
              />
            </div>
            <div className="pb-1">
              <p className="font-bold text-lg text-[var(--text-primary)]">
                {user?.displayName ?? user?.username}
              </p>
              <p className="text-sm text-[var(--text-muted)]">@{user?.username}</p>
            </div>
          </div>

          {/* Account fields */}
          <div className="bg-[var(--surface-raised)] rounded-[var(--radius-md)] p-4 flex flex-col gap-0">
            <AccountField
              label="Display Name"
              value={user?.displayName ?? user?.username ?? ''}
              isEditing={editingField === 'displayName'}
              onEdit={() => setEditingField('displayName')}
              onClose={() => setEditingField(null)}
              editComponent={<EditDisplayName onClose={() => setEditingField(null)} />}
            />
            <AccountField
              label="Username"
              value={user?.username ?? ''}
              isEditing={editingField === 'username'}
              onEdit={() => setEditingField('username')}
              onClose={() => setEditingField(null)}
              editComponent={<EditUsername onClose={() => setEditingField(null)} />}
            />
            <AccountField
              label="Email"
              value={maskedEmail}
              isEditing={editingField === 'email'}
              onEdit={() => setEditingField('email')}
              onClose={() => setEditingField(null)}
              editComponent={<EditEmail onClose={() => setEditingField(null)} />}
            />
          </div>
        </div>
      </div>

      {/* Password & Authentication */}
      <div className="mt-8">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
          Password and Authentication
        </h3>
        {editingField === 'password' ? (
          <ChangePassword onClose={() => setEditingField(null)} />
        ) : (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setEditingField('password')}
          >
            Change Password
          </Button>
        )}
      </div>

      {/* Account Removal */}
      <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
          Account Removal
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Disabling your account means you can recover it at any time after taking this action.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" size="sm" disabled>
            Disable Account
          </Button>
          <button
            disabled
            className="text-sm text-[var(--functional-error)] hover:underline disabled:opacity-50"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Account field row ────────────────────────────────────────────────────
function AccountField({
  label,
  value,
  isEditing,
  onEdit,
  onClose,
  editComponent,
}: {
  label: string
  value: string
  isEditing: boolean
  onEdit: () => void
  onClose: () => void
  editComponent: React.ReactNode
}) {
  if (isEditing) {
    return (
      <div className="py-3 border-b border-[var(--border-subtle)] last:border-0">
        {editComponent}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        <p className="text-sm text-[var(--text-primary)] mt-0.5">{value}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </div>
  )
}

// ── Inline editors ───────────────────────────────────────────────────────
function EditDisplayName({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: { displayName: user?.displayName ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileInput) => api.patch('/users/me', data),
    onSuccess: (res) => {
      updateUser(res.data as Partial<PublicUser>)
      notify.success('Display name updated!')
      onClose()
    },
    onError: () => notify.error('Failed to update display name'),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex items-end gap-3">
      <div className="flex-1">
        <Input
          label="Display Name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
      </div>
      <div className="flex gap-2 pb-0.5">
        <Button type="submit" size="sm" loading={mutation.isPending}>Save</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

function EditUsername({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateUsernameInput>({
    resolver: zodResolver(UpdateUsernameSchema),
    defaultValues: { username: user?.username ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (data: UpdateUsernameInput) => api.patch('/users/me/username', data),
    onSuccess: (res) => {
      updateUser(res.data as Partial<PublicUser>)
      notify.success('Username updated!')
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update username'
      notify.error(msg)
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex items-end gap-3">
      <div className="flex-1">
        <Input
          label="Username"
          error={errors.username?.message}
          {...register('username')}
        />
      </div>
      <div className="flex gap-2 pb-0.5">
        <Button type="submit" size="sm" loading={mutation.isPending}>Save</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

function EditEmail({ onClose }: { onClose: () => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateEmailInput>({
    resolver: zodResolver(UpdateEmailSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: UpdateEmailInput) => api.patch('/users/me/email', data),
    onSuccess: () => {
      notify.success('Email updated!')
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update email'
      notify.error(msg)
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-3">
      <Input
        label="New Email"
        type="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="relative">
        <Input
          label="Current Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password to confirm"
          error={errors.password?.message}
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-8 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={mutation.isPending}>Save</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [showPasswords, setShowPasswords] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
    onSuccess: () => {
      notify.success('Password changed!')
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to change password'
      notify.error(msg)
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-3 max-w-md">
      <div className="relative">
        <Input
          label="Current Password"
          type={showPasswords ? 'text' : 'password'}
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
      </div>
      <div className="relative">
        <Input
          label="New Password"
          type={showPasswords ? 'text' : 'password'}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
          className="accent-[var(--accent-primary)]"
        />
        Show passwords
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={mutation.isPending}>Change Password</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Profile — display name, bio, avatar
// ═══════════════════════════════════════════════════════════════════════════

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
        <div className="relative group">
          <Avatar
            src={user?.avatarUrl ?? undefined}
            fallback={user?.displayName ?? user?.username ?? '?'}
            size="xl"
          />
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </div>
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
            placeholder="Tell people a bit about yourself..."
            rows={3}
            maxLength={200}
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

// ═══════════════════════════════════════════════════════════════════════════
// Appearance — theme + layout
// ═══════════════════════════════════════════════════════════════════════════

function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [compactMode, setCompactMode] = useState(false)

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Appearance</h2>

      <SettingsSection title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                'flex flex-col items-center gap-2 px-4 py-4 rounded-[var(--radius-md)] border text-sm font-medium capitalize transition-all',
                theme === t
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-[var(--radius-sm)] border',
                t === 'dark' ? 'bg-[#1a1a2e] border-gray-700' :
                t === 'light' ? 'bg-white border-gray-300' :
                'bg-gradient-to-br from-white to-[#1a1a2e] border-gray-500',
              )} />
              {t}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Chat Display">
        <ToggleSetting
          label="Compact mode"
          description="Reduce the spacing between messages for a denser view"
          checked={compactMode}
          onChange={setCompactMode}
        />
      </SettingsSection>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Voice & Video
// ═══════════════════════════════════════════════════════════════════════════

function VoiceVideoSettings() {
  const [inputDevice, setInputDevice] = useState('default')
  const [outputDevice, setOutputDevice] = useState('default')
  const [inputVolume, setInputVolume] = useState(80)
  const [outputVolume, setOutputVolume] = useState(100)
  const [noiseSuppression, setNoiseSuppression] = useState(true)
  const [echoCancellation, setEchoCancellation] = useState(true)
  const [autoGainControl, setAutoGainControl] = useState(true)

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Voice & Video</h2>

      <SettingsSection title="Voice Settings">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Input Device
            </label>
            <select
              value={inputDevice}
              onChange={(e) => setInputDevice(e.target.value)}
              className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="default">Default</option>
            </select>
          </div>

          <SliderSetting label="Input Volume" value={inputVolume} onChange={setInputVolume} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Output Device
            </label>
            <select
              value={outputDevice}
              onChange={(e) => setOutputDevice(e.target.value)}
              className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="default">Default</option>
            </select>
          </div>

          <SliderSetting label="Output Volume" value={outputVolume} onChange={setOutputVolume} />
        </div>
      </SettingsSection>

      <SettingsSection title="Voice Processing">
        <ToggleSetting
          label="Echo cancellation"
          description="Reduces echo when using speakers instead of headphones"
          checked={echoCancellation}
          onChange={setEchoCancellation}
        />
        <ToggleSetting
          label="Noise suppression"
          description="Filters out background noise from your microphone"
          checked={noiseSuppression}
          onChange={setNoiseSuppression}
        />
        <ToggleSetting
          label="Automatic gain control"
          description="Automatically adjusts your microphone volume"
          checked={autoGainControl}
          onChange={setAutoGainControl}
        />
      </SettingsSection>

      <SettingsSection title="Video Settings">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Camera
          </label>
          <select
            className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          >
            <option value="default">Default</option>
          </select>
        </div>
      </SettingsSection>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Notifications
// ═══════════════════════════════════════════════════════════════════════════

function NotificationSettings() {
  const queryClient = useQueryClient()
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>('default')

  // Load notification permission state
  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setDesktopPermission('unsupported')
    } else {
      setDesktopPermission(Notification.permission)
    }
  }, [])

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const res = await api.get<{
        notifDms: boolean
        notifMentions: boolean
        notifHubActivity: boolean
        notifSounds: boolean
        notifDesktop: boolean
      }>('/notifications/settings')
      return res.data
    },
  })

  type NotifSettings = { notifDms: boolean; notifMentions: boolean; notifHubActivity: boolean; notifSounds: boolean; notifDesktop: boolean }

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<NotifSettings>) => api.patch('/notifications/settings', patch),
    onSuccess: (_, patch) => {
      queryClient.setQueryData(['notification-settings'], (old: NotifSettings | undefined) => ({ ...old, ...patch }))
      if (patch.notifSounds !== undefined) {
        window.__nexoraSoundsEnabled = patch.notifSounds
      }
    },
    onError: () => notify.error('Failed to save notification settings'),
  })

  const toggle = (key: keyof NotifSettings) => {
    if (!settings) { return }
    saveMutation.mutate({ [key]: !settings[key] })
  }

  const requestDesktopPermission = async () => {
    if (typeof Notification === 'undefined') { return }
    const result = await Notification.requestPermission()
    setDesktopPermission(result)
    if (result === 'granted') {
      saveMutation.mutate({ notifDesktop: true })
    }
  }

  const testSound = () => {
    import('@/lib/notification-sound').then(({ playNotificationSound }) => playNotificationSound())
  }

  if (isLoading || !settings) {
    return (
      <div>
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Notifications</h2>
        <div className="animate-pulse flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded bg-[var(--surface-panel)]" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Notifications</h2>

      <SettingsSection title="Desktop Notifications">
        <ToggleSetting
          label="Enable desktop notifications"
          description="Show browser push notifications when the tab is in the background"
          checked={settings.notifDesktop && desktopPermission === 'granted'}
          onChange={() => {
            if (desktopPermission !== 'granted') {
              requestDesktopPermission()
            } else {
              toggle('notifDesktop')
            }
          }}
        />
        {desktopPermission === 'denied' && (
          <p className="text-xs text-[var(--functional-error)] px-1">
            Browser notifications are blocked. Allow them in your browser settings.
          </p>
        )}
      </SettingsSection>

      <SettingsSection title="Notification Types">
        <ToggleSetting
          label="Direct messages"
          description="Notify me when I receive a direct message"
          checked={settings.notifDms}
          onChange={() => toggle('notifDms')}
        />
        <ToggleSetting
          label="Mentions"
          description="Notify me when someone @mentions me in a channel"
          checked={settings.notifMentions}
          onChange={() => toggle('notifMentions')}
        />
        <ToggleSetting
          label="Hub activity"
          description="Notify me about invites and announcements in my hubs"
          checked={settings.notifHubActivity}
          onChange={() => toggle('notifHubActivity')}
        />
      </SettingsSection>

      <SettingsSection title="Sounds">
        <ToggleSetting
          label="Notification sounds"
          description="Play a chime when a new notification arrives"
          checked={settings.notifSounds}
          onChange={() => toggle('notifSounds')}
        />
        {settings.notifSounds && (
          <div className="pt-1">
            <button
              onClick={testSound}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] text-sm bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors border border-[var(--border-default)]"
            >
              Test sound
            </button>
          </div>
        )}
      </SettingsSection>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Privacy & Safety
// ═══════════════════════════════════════════════════════════════════════════

function PrivacySettings() {
  const [allowDMs, setAllowDMs] = useState(true)
  const [showPresence, setShowPresence] = useState(true)
  const [allowSummaries, setAllowSummaries] = useState(true)
  const [showActivity, setShowActivity] = useState(true)

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Privacy & Safety</h2>

      <SettingsSection title="Direct Messages">
        <ToggleSetting
          label="Allow DMs from hub members"
          description="Let members of shared hubs send you direct messages"
          checked={allowDMs}
          onChange={setAllowDMs}
        />
      </SettingsSection>

      <SettingsSection title="Presence">
        <ToggleSetting
          label="Show my presence to others"
          description="Let people see your current online status"
          checked={showPresence}
          onChange={setShowPresence}
        />
        <ToggleSetting
          label="Share my activity"
          description="Let others see what you're currently doing"
          checked={showActivity}
          onChange={setShowActivity}
        />
      </SettingsSection>

      <SettingsSection title="Data Usage">
        <ToggleSetting
          label="Allow catch-up summaries"
          description="Let Nexora generate AI summaries of channels you've missed"
          checked={allowSummaries}
          onChange={setAllowSummaries}
        />
      </SettingsSection>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Accessibility
// ═══════════════════════════════════════════════════════════════════════════

function AccessibilitySettings() {
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [linkPreview, setLinkPreview] = useState(true)
  const [stickerAnimation, setStickerAnimation] = useState(true)

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Accessibility</h2>

      <SettingsSection title="Motion">
        <ToggleSetting
          label="Reduce motion"
          description="Disable animations and transitions throughout the app"
          checked={reduceMotion}
          onChange={setReduceMotion}
        />
        <ToggleSetting
          label="Play animated emoji/stickers"
          description="Allow animated content to auto-play"
          checked={stickerAnimation}
          onChange={setStickerAnimation}
        />
      </SettingsSection>

      <SettingsSection title="Visual">
        <ToggleSetting
          label="High contrast"
          description="Increase contrast between text and background colors"
          checked={highContrast}
          onChange={setHighContrast}
        />
        <SliderSetting
          label="Chat Font Size"
          value={fontSize}
          onChange={setFontSize}
          min={12}
          max={24}
          suffix="px"
        />
      </SettingsSection>

      <SettingsSection title="Content">
        <ToggleSetting
          label="Link preview"
          description="Show previews when links are shared in chat"
          checked={linkPreview}
          onChange={setLinkPreview}
        />
      </SettingsSection>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Keybinds
// ═══════════════════════════════════════════════════════════════════════════

function KeybindSettings() {
  const keybinds = [
    { action: 'Toggle Mute',           keys: 'Ctrl + Shift + M' },
    { action: 'Toggle Deafen',         keys: 'Ctrl + Shift + D' },
    { action: 'Search',                keys: 'Ctrl + K' },
    { action: 'Mark as Read',          keys: 'Escape' },
    { action: 'Quick Switcher',        keys: 'Ctrl + T' },
    { action: 'Upload File',           keys: 'Ctrl + Shift + U' },
    { action: 'Navigate Back',         keys: 'Alt + Left' },
    { action: 'Navigate Forward',      keys: 'Alt + Right' },
  ]

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Keybinds</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Keyboard shortcuts for common actions. Custom keybinds coming soon.
      </p>

      <div className="flex flex-col">
        {keybinds.map((kb) => (
          <div
            key={kb.action}
            className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)] last:border-0"
          >
            <span className="text-sm text-[var(--text-primary)]">{kb.action}</span>
            <kbd className="px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--surface-panel)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-secondary)]">
              {kb.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Language
// ═══════════════════════════════════════════════════════════════════════════

function LanguageSettings() {
  const [language, setLanguage] = useState('en-US')

  const languages = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'es',    label: 'Espanol' },
    { code: 'fr',    label: 'Francais' },
    { code: 'de',    label: 'Deutsch' },
    { code: 'ja',    label: 'Japanese' },
    { code: 'ko',    label: 'Korean' },
    { code: 'pt-BR', label: 'Portugues (Brasil)' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
  ]

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Language</h2>

      <SettingsSection title="Display Language">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </SettingsSection>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared components
// ═══════════════════════════════════════════════════════════════════════════

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
        {title}
      </h3>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  )
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors shrink-0',
          checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
    </div>
  )
}

function SliderSetting({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = '%',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  suffix?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </label>
        <span className="text-xs text-[var(--text-secondary)]">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent-primary)] h-1.5 rounded-full appearance-none bg-[var(--surface-active)] cursor-pointer"
      />
    </div>
  )
}
