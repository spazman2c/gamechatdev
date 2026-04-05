import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-ui font-semibold text-sm tracking-wide',
    'select-none whitespace-nowrap',
    'transition-all duration-[120ms] ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--accent-primary)] text-white',
          'hover:bg-[var(--accent-primary-light)]',
          'active:scale-[0.98]',
          'shadow-[0_0_12px_var(--accent-primary-glow)]',
          'hover:shadow-[0_0_20px_var(--accent-primary-glow)]',
        ],
        secondary: [
          'bg-[var(--surface-panel)] text-[var(--text-primary)]',
          'border border-[var(--border-default)]',
          'hover:bg-[var(--surface-active)] hover:border-[var(--border-strong)]',
          'active:scale-[0.98]',
        ],
        ghost: [
          'text-[var(--text-secondary)]',
          'hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
          'active:bg-[var(--surface-active)]',
        ],
        danger: [
          'bg-[var(--functional-error)] text-white',
          'hover:opacity-90',
          'active:scale-[0.98]',
          'shadow-[0_0_12px_rgba(255,100,124,0.2)]',
        ],
        outline: [
          'border border-[var(--accent-primary)] text-[var(--accent-primary)]',
          'hover:bg-[var(--accent-primary-bg)]',
          'active:scale-[0.98]',
        ],
        link: [
          'text-[var(--text-link)] underline-offset-4',
          'hover:underline hover:text-[var(--text-link-hover)]',
          'p-0 h-auto',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-[var(--radius-sm)]',
        md: 'h-9 px-4 text-sm rounded-[var(--radius-sm)]',
        lg: 'h-11 px-6 text-base rounded-[var(--radius-md)]',
        icon: 'h-9 w-9 rounded-[var(--radius-sm)]',
        'icon-sm': 'h-7 w-7 rounded-[var(--radius-xs)]',
        'icon-lg': 'h-11 w-11 rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
