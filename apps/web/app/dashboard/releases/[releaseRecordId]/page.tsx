import {
  isReleaseWorkflowWorkspaceFocus,
  type ReleaseWorkflowWorkspaceFocus,
} from "@/lib/release-workflow"
import { ReleaseWorkflowPage } from "@/components/dashboard/release-workflow-page"

export default async function ReleaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ releaseRecordId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { releaseRecordId } = await params
  const resolvedSearchParams = await searchParams
  const preferredFocusSectionRaw =
    typeof resolvedSearchParams.focus === "string" ? resolvedSearchParams.focus : null
  const preferredFocusSection: ReleaseWorkflowWorkspaceFocus | null =
    isReleaseWorkflowWorkspaceFocus(preferredFocusSectionRaw) ? preferredFocusSectionRaw : null
  const invalidFocusValue =
    preferredFocusSectionRaw && !preferredFocusSection ? preferredFocusSectionRaw : null

  return (
    <ReleaseWorkflowPage
      emptyDescription="The requested release record is no longer available in this workspace."
      emptyTitle="Release not found"
      invalidFocusValue={invalidFocusValue}
      mode="overview"
      overviewVariant="detail"
      preferredFocusSection={preferredFocusSection}
      preferredReleaseRecordId={releaseRecordId}
      unavailableDescription="The authenticated API request failed before the release workspace could be rendered."
      unavailableTitle="Release is unavailable"
    />
  )
}
