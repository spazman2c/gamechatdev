import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-ui font-medium select-none',
  {
    variants: {
      variant: {
        default:  'bg-[var(--surface-panel)] text-[var(--text-secondary)] border border-[var(--border-default)]',
        primary:  'bg-[var(--accent-primary-bg)] text-[var(--accent-primary)] border border-[var(--accent-primary-border)]',
        success:  'bg-[var(--functional-success-bg)] text-[var(--functional-success)] border border-[var(--functional-success-border)]',
        warning:  'bg-[var(--functional-warning-bg)] text-[var(--functional-warning)] border border-[var(--functional-warning-border)]',
        error:    'bg-[var(--functional-error-bg)] text-[var(--functional-error)] border border-[var(--functional-error-border)]',
        info:     'bg-[var(--functional-info-bg)] text-[var(--functional-info)]',
        online:   'bg-[rgba(56,211,159,0.12)] text-[#38D39F]',
        solid:    'bg-[var(--accent-primary)] text-white',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5 rounded-[var(--radius-xs)]',
        md: 'text-xs px-2 py-0.5 rounded-[var(--radius-xs)]',
        lg: 'text-sm px-2.5 py-1 rounded-[var(--radius-sm)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  dotColor?: string
  count?: number
}

function Badge({
  className,
  variant,
  size,
  dot,
  dotColor,
  count,
  children,
  ...props
}: BadgeProps) {
  const displayContent = count !== undefined ? (count > 99 ? '99+' : count) : children

  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: dotColor ?? 'currentColor' }}
          aria-hidden="true"
        />
      )}
      {displayContent}
    </span>
  )
}

export { Badge, badgeVariants }
