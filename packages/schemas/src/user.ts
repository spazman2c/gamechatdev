import { z } from 'zod'

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional().nullable(),
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

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
