import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const avatarVariants = cva(
  'relative inline-flex shrink-0 select-none rounded-full overflow-hidden',
  {
    variants: {
      size: {
        xs:  'h-6 w-6 text-[10px]',
        sm:  'h-8 w-8 text-xs',
        md:  'h-10 w-10 text-sm',
        lg:  'h-12 w-12 text-base',
        xl:  'h-16 w-16 text-lg',
        '2xl': 'h-24 w-24 text-2xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

const presenceDotVariants = cva(
  'absolute bottom-0 right-0 rounded-full border-2 border-[var(--surface-base)]',
  {
    variants: {
      size: {
        xs:    'h-2 w-2',
        sm:    'h-2.5 w-2.5',
        md:    'h-3 w-3',
        lg:    'h-3.5 w-3.5',
        xl:    'h-4 w-4',
        '2xl': 'h-5 w-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  presenceColor?: string
  showPresence?: boolean
}

function Avatar({
  className,
  size,
  src,
  alt,
  fallback,
  presenceColor,
  showPresence = false,
  ...props
}: AvatarProps) {
  // Generate a simple color from fallback text for background
  const bgColor = fallback
    ? getBgColor(fallback)
    : 'var(--surface-panel)'

  return (
    <AvatarPrimitive.Root
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      <AvatarPrimitive.Image
        src={src}
        alt={alt ?? fallback ?? 'Avatar'}
        className="h-full w-full object-cover"
      />
      <AvatarPrimitive.Fallback
        style={{ backgroundColor: bgColor }}
        className="flex h-full w-full items-center justify-center font-ui font-semibold text-white"
        delayMs={300}
      >
        {fallback?.slice(0, 2).toUpperCase() ?? '?'}
      </AvatarPrimitive.Fallback>
      {showPresence && presenceColor && (
        <span
          className={cn(presenceDotVariants({ size }))}
          style={{ backgroundColor: presenceColor }}
          aria-hidden="true"
        />
      )}
    </AvatarPrimitive.Root>
  )
}

function getBgColor(str: string): string {
  const palette = [
    '#7C5CFF', '#39D5FF', '#3EE6B5', '#FF6FAE',
    '#FFB84D', '#5AB2FF', '#9B6AFF', '#FF4088',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length] ?? palette[0]!
}

export { Avatar }
