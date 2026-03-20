import type { ReactNode } from "react"

type WorkspaceSelectionShellProps = {
  children?: ReactNode
}

export function WorkspaceSelectionShell({ children }: WorkspaceSelectionShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="space-y-2">
          <div className="text-xl font-semibold tracking-tight">
            Choose the current PulseNote workspace
          </div>
          <p className="text-sm text-muted-foreground">
            Pick the workspace before loading the dashboard so release records, evidence links,
            and review state never mix across tenants.
          </p>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
