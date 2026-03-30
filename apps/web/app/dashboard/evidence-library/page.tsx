import { permanentRedirect } from "next/navigation"

import { buildReleaseWorkspaceHref } from "@/lib/release-workflow"

export default async function EvidenceLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const selectedId =
    typeof resolvedSearchParams.selected === "string"
      ? resolvedSearchParams.selected
      : null

  permanentRedirect(
    buildReleaseWorkspaceHref({
      focus: "claim_check",
      selectedId,
    }),
  )
}
