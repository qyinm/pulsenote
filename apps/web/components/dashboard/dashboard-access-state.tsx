import { DashboardPage, SurfaceCard } from "@/components/dashboard/surfaces"

type DashboardAccessStateProps = {
  state: "signed-out" | "no-workspace"
}

const accessCopy = {
  "no-workspace": {
    description:
      "This account does not belong to a PulseNote workspace yet, so no release records can be reviewed.",
    detail:
      "Add this user to a workspace membership before using release context, claim check, approval, or publish pack.",
    title: "No workspace membership found",
  },
  "signed-out": {
    description:
      "Sign in before opening the release workspace so every record stays scoped to the correct reviewer and evidence trail.",
    detail:
      "PulseNote only shows release context after the current session and workspace membership are both resolved.",
    title: "Sign in to open the dashboard",
  },
} satisfies Record<DashboardAccessStateProps["state"], { description: string; detail: string; title: string }>

export function DashboardAccessState({ state }: DashboardAccessStateProps) {
  const copy = accessCopy[state]

  return (
    <DashboardPage>
      <SurfaceCard title={copy.title} description={copy.description}>
        <p className="text-sm text-muted-foreground">{copy.detail}</p>
      </SurfaceCard>
    </DashboardPage>
  )
}
