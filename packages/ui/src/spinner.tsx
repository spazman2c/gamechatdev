import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
        xl: 'h-8 w-8',
      },
      color: {
        default: 'text-[var(--accent-primary)]',
        muted:   'text-[var(--text-muted)]',
        white:   'text-white',
        current: 'text-current',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'default',
    },
  },
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

function Spinner({ className, size, color, label = 'Loading…', ...props }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} {...props}>
      <span
        className={cn(spinnerVariants({ size, color }), className)}
        aria-hidden="true"
      />
    </span>
  )
}

export { Spinner }
