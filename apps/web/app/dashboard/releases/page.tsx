import { ReleaseWorkflowPage } from "@/components/dashboard/release-workflow-page"

export default function ReleasesPage() {
  return (
    <ReleaseWorkflowPage
      mode="overview"
      unavailableTitle="Releases are unavailable"
      unavailableDescription="The authenticated API request failed before the releases board could be rendered."
      emptyTitle="No releases yet"
      emptyDescription="Create one release scope first, then PulseNote will keep the full workflow on one release record."
    />
  )
}
