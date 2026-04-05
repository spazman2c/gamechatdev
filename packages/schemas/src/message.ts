import { z } from 'zod'

export const SendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message is too long')
    .optional(),
  replyToId: z.string().uuid().optional(),
  attachmentUrls: z.array(z.string().url()).max(10).optional(),
})

export const EditMessageSchema = z.object({
  content: z.string().min(1).max(4000),
})

export const SearchMessagesSchema = z.object({
  q: z.string().min(1).max(200),
  channelId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  hasImage: z.coerce.boolean().optional(),
  hasLink: z.coerce.boolean().optional(),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
})

export type SendMessageInput = z.infer<typeof SendMessageSchema>
export type EditMessageInput = z.infer<typeof EditMessageSchema>
export type SearchMessagesInput = z.infer<typeof SearchMessagesSchema>
