import { ReleaseWorkflowPage } from "@/components/dashboard/release-workflow-page"

export default function ClaimCheckPage() {
  return (
    <ReleaseWorkflowPage
      mode="claim_check"
      unavailableTitle="Claim check is unavailable"
      unavailableDescription="The authenticated API request failed before the founder claim-check queue could be rendered."
      emptyTitle="No claim checks in queue"
      emptyDescription="Draft a release record first, then run claim check to surface customer-facing wording risks."
    />
  )
}
