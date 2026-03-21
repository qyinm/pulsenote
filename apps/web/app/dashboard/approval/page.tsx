import { ReleaseWorkflowPage } from "@/components/dashboard/release-workflow-page"

export default function ApprovalPage() {
  return (
    <ReleaseWorkflowPage
      mode="approval"
      unavailableTitle="Approval workflow is unavailable"
      unavailableDescription="The authenticated API request failed before the founder approval queue could be rendered."
      emptyTitle="No approval records yet"
      emptyDescription="Run claim check and request approval to move release records into a human sign-off queue."
    />
  )
}
