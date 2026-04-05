'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@nexora/ui/button'
import { Input } from '@nexora/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    setError(null)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <>
        <h2 className="font-brand text-2xl font-bold text-[var(--text-primary)] mb-3">
          Check your email
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          If an account with <strong>{email}</strong> exists, we sent a reset link. Check your inbox.
        </p>
        <Link
          href="/login"
          className="text-sm text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors"
        >
          ← Back to sign in
        </Link>
      </>
    )
  }

  return (
    <>
      <h2 className="font-brand text-2xl font-bold text-[var(--text-primary)] mb-2">
        Reset your password
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-[var(--functional-error)]">{error}</p>
        )}

        <Button type="submit" loading={isLoading} className="w-full mt-2">
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        <Link href="/login" className="text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors">
          ← Back to sign in
        </Link>
      </p>
    </>
  )
}
