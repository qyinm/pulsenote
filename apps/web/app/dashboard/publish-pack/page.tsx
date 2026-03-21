import { ReleaseWorkflowPage } from "@/components/dashboard/release-workflow-page"

export default function PublishPackPage() {
  return (
    <ReleaseWorkflowPage
      mode="publish_pack"
      unavailableTitle="Publish pack is unavailable"
      unavailableDescription="The authenticated API request failed before the founder publish-pack queue could be rendered."
      emptyTitle="No publish packs ready"
      emptyDescription="Approve a draft before trying to freeze a publish pack for release handoff."
    />
  )
}
