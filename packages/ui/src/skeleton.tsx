import * as React from 'react'
import { cn } from './utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

function Skeleton({ className, rounded = 'sm', ...props }: SkeletonProps) {
  const radiusClass = {
    sm:   'rounded-[var(--radius-sm)]',
    md:   'rounded-[var(--radius-md)]',
    lg:   'rounded-[var(--radius-lg)]',
    full: 'rounded-full',
  }[rounded]

  return (
    <div
      className={cn(
        'animate-pulse bg-[var(--surface-panel)]',
        radiusClass,
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  )
}

// Compound skeletons for common patterns
function SkeletonMessage() {
  return (
    <div className="flex gap-3 px-4 py-2">
      <Skeleton rounded="full" className="h-10 w-10 shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex gap-2 items-center">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16 opacity-50" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

function SkeletonChannelRow() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Skeleton className="h-4 w-4 shrink-0" />
      <Skeleton className="h-3.5 flex-1" />
    </div>
  )
}

function SkeletonMemberRow() {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Skeleton rounded="full" className="h-8 w-8 shrink-0" />
      <div className="flex flex-col gap-1 flex-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-16 opacity-60" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonMessage, SkeletonChannelRow, SkeletonMemberRow }
