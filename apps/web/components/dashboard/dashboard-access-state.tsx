import Link from "next/link"

import { DashboardPage, SurfaceCard } from "@/components/dashboard/surfaces"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DashboardAccessStateProps = {
  state: "signed-out" | "no-workspace" | "workspace-selection-required"
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
  "workspace-selection-required": {
    description:
      "This account belongs to more than one PulseNote workspace, so the dashboard needs an explicit workspace selection before it can load release context safely.",
    detail:
      "Choose the current workspace first so release records, evidence links, and review state never mix across tenants.",
    title: "Select a workspace before opening the dashboard",
  },
} satisfies Record<DashboardAccessStateProps["state"], { description: string; detail: string; title: string }>

export function DashboardAccessState({ state }: DashboardAccessStateProps) {
  const copy = accessCopy[state]
  const action =
    state === "signed-out" ? (
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/auth/sign-in" className={buttonVariants({ size: "sm" })}>
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          Create account
        </Link>
      </div>
    ) : undefined

  return (
    <DashboardPage>
      <SurfaceCard title={copy.title} description={copy.description} action={action}>
        <p className="text-sm text-muted-foreground">{copy.detail}</p>
      </SurfaceCard>
    </DashboardPage>
  )
}
