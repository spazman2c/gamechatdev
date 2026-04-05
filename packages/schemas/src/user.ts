import { z } from 'zod'

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  presence: z
    .enum([
      'online',
      'open_to_chat',
      'focused',
      'listening_only',
      'available_for_calls',
      'co_op',
      'hosting',
      'quiet',
      'offline',
    ])
    .optional(),
})

export const UpdateUsernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-z0-9_.-]+$/, 'Username can only contain lowercase letters, numbers, _, ., -'),
})

export const UpdateEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required for verification'),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type UpdateUsernameInput = z.infer<typeof UpdateUsernameSchema>
export type UpdateEmailInput = z.infer<typeof UpdateEmailSchema>
