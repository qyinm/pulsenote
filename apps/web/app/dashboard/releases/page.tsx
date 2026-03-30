import {
  isReleaseWorkflowWorkspaceFocus,
  type ReleaseWorkflowWorkspaceFocus,
} from "@/lib/release-workflow"
import { ReleaseWorkflowPage } from "@/components/dashboard/release-workflow-page"

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const preferredReleaseRecordId =
    typeof resolvedSearchParams.selected === "string"
      ? resolvedSearchParams.selected
      : null
  const preferredFocusSectionRaw =
    typeof resolvedSearchParams.focus === "string" ? resolvedSearchParams.focus : null
  const preferredFocusSection: ReleaseWorkflowWorkspaceFocus | null =
    isReleaseWorkflowWorkspaceFocus(preferredFocusSectionRaw) ? preferredFocusSectionRaw : null
  const invalidFocusValue =
    preferredFocusSectionRaw && !preferredFocusSection ? preferredFocusSectionRaw : null

  return (
    <ReleaseWorkflowPage
      invalidFocusValue={invalidFocusValue}
      mode="overview"
      preferredFocusSection={preferredFocusSection}
      preferredReleaseRecordId={preferredReleaseRecordId}
      unavailableTitle="Releases are unavailable"
      unavailableDescription="The authenticated API request failed before the releases board could be rendered."
      emptyTitle="No releases yet"
      emptyDescription="Create one release scope first, then PulseNote will keep the full workflow on one release record."
    />
  )
}
