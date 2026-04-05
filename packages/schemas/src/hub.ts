import { z } from 'zod'

const JOIN_POLICIES = [
  'open',
  'invite_only',
  'email_confirmed',
  'phone_confirmed',
  'mutual_vouch',
  'waitlist',
  'age_gated',
] as const

const ATMOSPHERES = ['studio', 'arcade', 'lounge', 'guild', 'orbit'] as const

export const CreateHubSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
  joinPolicy: z.enum(JOIN_POLICIES).default('open'),
  atmosphere: z.enum(ATMOSPHERES).default('orbit'),
})

export const UpdateHubSchema = CreateHubSchema.partial().extend({
  iconUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  bannerColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  verificationLevel: z.number().int().min(0).max(4).optional(),
  contentFilter: z.number().int().min(0).max(2).optional(),
  isCommunity: z.boolean().optional(),
  systemChannelId: z.string().uuid().nullable().optional(),
})

export const CreateZoneSchema = z.object({
  name: z.string().min(1).max(100),
})

export const UpdateZoneSchema = CreateZoneSchema.partial().extend({
  position: z.number().int().min(0).optional(),
})

export const CreateInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(1000).optional().nullable(),
  expiresIn: z
    .enum(['30m', '1h', '6h', '12h', '1d', '7d', 'never'])
    .default('7d'),
  temporary: z.boolean().optional().default(false),
})

export type CreateHubInput = z.infer<typeof CreateHubSchema>
export type UpdateHubInput = z.infer<typeof UpdateHubSchema>
export type CreateZoneInput = z.infer<typeof CreateZoneSchema>
export type UpdateZoneInput = z.infer<typeof UpdateZoneSchema>
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>
