'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, type LoginInput } from '@nexora/schemas'
import { Button } from '@nexora/ui/button'
import { Input } from '@nexora/ui/input'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, isAuthenticated } = useAuthStore()

  // If already authenticated (e.g., token refreshed in background), go to app
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/app')
    }
  }, [isAuthenticated, router])
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.accessToken, res.data.user)
      router.push('/app')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.'
      setServerError(msg)
    }
  }

  return (
    <>
      <h2 className="font-brand text-2xl font-bold text-[var(--text-primary)] mb-6">
        Welcome back
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          {...register('password')}
        />

        {serverError && (
          <p role="alert" className="text-sm text-[var(--functional-error)]">
            {serverError}
          </p>
        )}

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors font-medium"
        >
          Create one
        </Link>
      </p>
    </>
  )
}
