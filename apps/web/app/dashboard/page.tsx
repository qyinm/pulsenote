import { ReleaseWorkflowPage } from "@/components/dashboard/release-workflow-page"

export default function DashboardPage() {
  return (
    <ReleaseWorkflowPage
      mode="overview"
      unavailableTitle="Founder release workflow is unavailable"
      unavailableDescription="The authenticated API request failed before the release workflow overview could be rendered."
      emptyTitle="No founder workflow records yet"
      emptyDescription="Release workflow records will appear here once release context is ingested from the connected workspace."
    />
  )
}
