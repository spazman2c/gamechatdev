import { z } from 'zod'

const CHANNEL_TYPES = ['text', 'announcement', 'voice', 'video', 'stage'] as const
const ROOM_MODES = [
  'hangout',
  'study',
  'co_work',
  'game_squad',
  'stage_qa',
  'watch_party',
  'music_room',
  'support_room',
] as const

export const CreateChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-_]+$/, 'Channel names can only contain lowercase letters, numbers, hyphens, and underscores'),
  type: z.enum(CHANNEL_TYPES).default('text'),
  zoneId: z.string().uuid().optional().nullable(),
  topic: z.string().max(1024).optional().nullable(),
  isNsfw: z.boolean().default(false),
  slowmodeDelay: z.number().int().min(0).max(21600).default(0),
  roomMode: z.enum(ROOM_MODES).optional().nullable(),
  capacity: z.number().int().min(2).max(1000).optional().nullable(),
})

export const UpdateChannelSchema = CreateChannelSchema.partial().extend({
  position: z.number().int().min(0).optional(),
})

export type CreateChannelInput = z.infer<typeof CreateChannelSchema>
export type UpdateChannelInput = z.infer<typeof UpdateChannelSchema>
