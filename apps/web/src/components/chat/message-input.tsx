'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Send, Paperclip, X, SmilePlus, FileText, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { emitTypingStart, emitTypingStop } from '@/hooks/use-socket'
import { useMentionStore, clearMention } from '@/store/mention'
import type { Message } from '@nexora/types'

interface PendingAttachment {
  file: File
  previewUrl: string | null
  publicUrl: string | null
  uploading: boolean
  error: boolean
}

interface MessageInputProps {
  channelId: string
  channelName: string
  replyTo?: Message | null
  onCancelReply?: () => void
  disabled?: boolean
}

export function MessageInput({
  channelId,
  channelName,
  replyTo,
  onCancelReply,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)

  const pendingMention = useMentionStore((s) => s.pendingMention)

  // Inject @mention prefix when triggered from context menu
  useEffect(() => {
    if (!pendingMention) { return }
    setContent((prev) => {
      const prefix = `@${pendingMention} `
      return prev ? `${prev} ${prefix}` : prefix
    })
    clearMention()
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [pendingMention])
  const sendMutation = useMutation({
    mutationFn: (body: { content: string; replyToId?: string; attachmentUrls?: string[] }) =>
      api.post<Message>('/messages', body, { params: { channelId } }),
    onError: () => notify.error('Failed to send message'),
  })

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) { return }
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [content, resizeTextarea])

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      emitTypingStart(channelId)
    }
    if (typingTimeout.current) { clearTimeout(typingTimeout.current) }
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false)
      emitTypingStop(channelId)
    }, 3000)
  }, [channelId, isTyping])

  const uploadFile = useCallback(async (file: File, index: number) => {
    setAttachments((prev) =>
      prev.map((a, i) => (i === index ? { ...a, uploading: true } : a)),
    )

    try {
      const { data } = await api.post<{ presignedUrl: string; publicUrl: string }>('/uploads/presign', {
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })

      await fetch(data.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      setAttachments((prev) =>
        prev.map((a, i) => (i === index ? { ...a, uploading: false, publicUrl: data.publicUrl } : a)),
      )
    } catch {
      setAttachments((prev) =>
        prev.map((a, i) => (i === index ? { ...a, uploading: false, error: true } : a)),
      )
      notify.error(`Failed to upload ${file.name}`)
    }
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (!files.length) { return }

      const newAttachments: PendingAttachment[] = files.map((file) => ({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        publicUrl: null,
        uploading: false,
        error: false,
      }))

      setAttachments((prev) => {
        const startIndex = prev.length
        const next = [...prev, ...newAttachments]
        // Start uploads
        newAttachments.forEach((_, i) => {
          uploadFile(files[i]!, startIndex + i)
        })
        return next
      })

      // Reset input so same file can be reselected
      e.target.value = ''
    },
    [uploadFile],
  )

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const a = prev[index]
      if (a?.previewUrl) { URL.revokeObjectURL(a.previewUrl) }
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = content.trim()
    const hasAttachments = attachments.some((a) => a.publicUrl)
    if ((!trimmed && !hasAttachments) || sendMutation.isPending || disabled) { return }

    const stillUploading = attachments.some((a) => a.uploading)
    if (stillUploading) {
      notify.error('Please wait for uploads to finish')
      return
    }

    const attachmentUrls = attachments.filter((a) => a.publicUrl).map((a) => a.publicUrl!)

    sendMutation.mutate({
      content: trimmed,
      ...(replyTo?.id !== undefined && { replyToId: replyTo.id }),
      attachmentUrls,
    })

    setContent('')
    setAttachments([])
    onCancelReply?.()
    emitTypingStop(channelId)
    setIsTyping(false)
    if (typingTimeout.current) { clearTimeout(typingTimeout.current) }

    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [content, attachments, sendMutation, disabled, channelId, replyTo, onCancelReply])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isUploading = attachments.some((a) => a.uploading)
  const canSend = (content.trim() || attachments.some((a) => a.publicUrl)) && !sendMutation.isPending && !disabled && !isUploading

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[var(--surface-panel)] rounded-t-[var(--radius-sm)] border border-b-0 border-[var(--border-subtle)] text-sm">
          <div className="flex-1 min-w-0">
            <span className="text-[var(--text-muted)] text-xs">Replying to </span>
            <span className="text-[var(--accent-primary)] text-xs font-medium">
              {replyTo.author?.displayName ?? replyTo.author?.username}
            </span>
            <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-3 py-2 bg-[var(--surface-panel)] border border-b-0 border-[var(--border-subtle)] rounded-t-[var(--radius-sm)]">
          {attachments.map((a, i) => (
            <div
              key={i}
              className="relative group flex items-center justify-center w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] overflow-hidden shrink-0"
            >
              {a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt={a.file.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 p-2">
                  <FileText className="h-5 w-5 text-[var(--text-muted)]" />
                  <span className="text-[8px] text-[var(--text-muted)] text-center truncate w-full leading-tight">
                    {a.file.name}
                  </span>
                </div>
              )}
              {a.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {a.error && (
                <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                  <span className="text-[9px] text-white font-medium">Error</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 h-4 w-4 bg-black/70 rounded-full flex items-center justify-center transition-opacity"
                aria-label="Remove attachment"
              >
                <X className="h-2.5 w-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.txt,.zip"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* Input box */}
      <div
        className={cn(
          'flex items-end gap-2 bg-[var(--surface-panel)] border border-[var(--border-default)]',
          'rounded-[var(--radius-md)] px-3 py-2.5',
          'focus-within:border-[var(--accent-primary)] transition-colors',
          (replyTo || attachments.length > 0) && 'rounded-t-none border-t-0',
        )}
      >
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors self-center"
          aria-label="Attach file"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            handleTyping()
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          disabled={disabled}
          rows={1}
          aria-label={`Message #${channelName}`}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none max-h-[200px] leading-relaxed disabled:opacity-50"
        />

        {/* Emoji button */}
        <button
          className="shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors self-center"
          aria-label="Insert emoji"
          disabled={disabled}
        >
          <SmilePlus className="h-4 w-4" />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'shrink-0 h-7 w-7 flex items-center justify-center rounded-[var(--radius-xs)] transition-all self-center',
            canSend
              ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-light)] shadow-[var(--shadow-glow-violet)]'
              : 'text-[var(--text-muted)] cursor-not-allowed',
          )}
        >
          {isUploading ? (
            <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
