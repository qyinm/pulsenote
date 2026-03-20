import type { ReactNode } from "react"

type WorkspaceOnboardingShellProps = {
  children: ReactNode
}

export function WorkspaceOnboardingShell({ children }: WorkspaceOnboardingShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="space-y-2">
          <div className="text-xl font-semibold tracking-tight">
            Create your first PulseNote workspace
          </div>
          <p className="text-sm text-muted-foreground">
            Start a workspace that will keep release context, claim checks, approvals, and publish
            pack decisions inside one reviewable trail.
          </p>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
