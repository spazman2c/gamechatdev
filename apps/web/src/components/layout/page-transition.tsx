'use client'

import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div
      key={pathname}
      className="flex flex-1 flex-col overflow-hidden animate-[fade-in_0.12s_ease]"
    >
      {children}
    </div>
  )
}
