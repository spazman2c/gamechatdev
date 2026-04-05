'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@nexora/ui/button'
import { Input } from '@nexora/ui/input'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-[var(--functional-error)] mb-4">
          Invalid or missing reset token.
        </p>
        <Link href="/forgot-password" className="text-[var(--text-link)] text-sm hover:text-[var(--text-link-hover)]">
          Request a new reset link
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setIsLoading(true)
    setError(null)
    try {
      await api.post('/auth/reset-password', { token, password })
      router.push('/login?reset=1')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Reset failed. The link may have expired.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <h2 className="font-brand text-2xl font-bold text-[var(--text-primary)] mb-2">
        Choose a new password
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">Must be at least 8 characters.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error && <p role="alert" className="text-sm text-[var(--functional-error)]">{error}</p>}

        <Button type="submit" loading={isLoading} className="w-full mt-2">
          Reset password
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-4 text-[var(--text-muted)]">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
