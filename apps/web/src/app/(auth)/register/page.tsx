'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterSchema, type RegisterInput } from '@nexora/schemas'
import { Button } from '@nexora/ui/button'
import { Input } from '@nexora/ui/input'
import { api } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)
    try {
      await api.post('/auth/register', data)
      router.push('/login')
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
        Create your account
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Username"
          type="text"
          autoComplete="username"
          placeholder="yourname"
          hint="Lowercase letters, numbers, -, _, . only"
          error={errors.username?.message}
          {...register('username')}
        />

        <Input
          label="Display name"
          type="text"
          autoComplete="name"
          placeholder="Your Name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />

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
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          hint="Must contain uppercase letters and numbers"
          error={errors.password?.message}
          {...register('password')}
        />

        {serverError && (
          <p role="alert" className="text-sm text-[var(--functional-error)]">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
