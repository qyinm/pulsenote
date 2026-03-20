import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"

export function WorkspaceSelectionEmptyState() {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        No workspace memberships are available yet. Create or join a release workspace before
        choosing the current tenant.
      </p>
      <Link href="/onboarding" className={buttonVariants({ size: "lg" })}>
        Open workspace onboarding
      </Link>
    </div>
  )
}
