import { MessageSquare, Users, Zap } from 'lucide-react'

export default function AppHomePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="font-brand text-3xl font-extrabold text-gradient-brand mb-3">
          Welcome to Nexora
        </h1>
        <p className="text-[var(--text-secondary)] text-base mb-10">
          Select a Hub from the left to start chatting, or create one to get started.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Chat"
            description="Streams for every topic"
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Rooms"
            description="Drop-in voice & video"
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Pulse"
            description="Always know what's live"
          />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="surface-elevated rounded-[var(--radius-md)] p-4 text-center flex flex-col items-center gap-2">
      <div className="text-[var(--accent-primary)]">{icon}</div>
      <p className="font-ui font-semibold text-sm text-[var(--text-primary)]">{title}</p>
      <p className="text-xs text-[var(--text-muted)]">{description}</p>
    </div>
  )
}
