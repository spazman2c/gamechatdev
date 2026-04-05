export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)] px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-brand text-3xl font-extrabold text-gradient-brand">
            Nexora
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Built for real connection.
          </p>
        </div>
        {/* Card */}
        <div className="surface-elevated rounded-[var(--radius-lg)] p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
