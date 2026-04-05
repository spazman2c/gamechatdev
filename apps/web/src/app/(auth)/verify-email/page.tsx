'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Spinner } from '@nexora/ui/spinner'
import { api } from '@/lib/api'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Spinner size="lg" />
        <p className="text-[var(--text-secondary)]">Verifying your email…</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-2">
          Email verified!
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          Your account is ready. You can now sign in.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-9 px-4 rounded-[var(--radius-sm)] bg-[var(--accent-primary)] text-white font-semibold text-sm hover:bg-[var(--accent-primary-light)] transition-colors"
        >
          Sign in to Nexora
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center py-4">
      <div className="text-4xl mb-4">❌</div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-2">
        Verification failed
      </h2>
      <p className="text-[var(--text-secondary)] text-sm mb-6">
        This link may have expired or already been used. Try registering again or contact support.
      </p>
      <Link
        href="/register"
        className="text-[var(--text-link)] hover:text-[var(--text-link-hover)] text-sm font-medium"
      >
        Back to registration
      </Link>
    </div>
  )
}
