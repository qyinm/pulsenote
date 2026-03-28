import type { GitHubConnection, ReleaseRecordSnapshot } from "../api/client"
import { createApiClient } from "../api/client"
import { getForwardedAuthHeaders } from "../auth/headers"

type ReleaseContextApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "getReleaseRecord" | "listReleaseRecords"
>

type ReleaseContextGitHubApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "beginGitHubInstall" | "getGitHubConnection"
>

export type ReleaseContextReadiness = "Ready" | "Needs review" | "At risk"
export type ReleaseContextFreshness = "Fresh" | "Watch" | "Stale" | "No evidence"

export type ReleaseContextQueueItem = {
  blockerSummary: string
  claimSummary: string
  evidenceCount: number
  freshness: ReleaseContextFreshness
  id: string
  readiness: ReleaseContextReadiness
  sourceSummary: string
  stageLabel: string
  summary: string
  title: string
}

export type ReleaseContextMetrics = {
  atRiskRecords: number
  linkedClaims: number
  recordsInQueue: number
  totalEvidence: number
}

export type ReleaseContextData = {
  releaseRecords: ReleaseRecordSnapshot[]
  selectedId: string | null
  selectedReleaseRecord: ReleaseRecordSnapshot | null
}

export type ReleaseContextGithubState = {
  connection: GitHubConnection | null
  installUrl: string | null
}

export function createReleaseContextDetailCache(
  selectedId: string,
  selectedReleaseRecord: ReleaseRecordSnapshot,
) {
  return {
    [selectedId]: selectedReleaseRecord,
  } satisfies Record<string, ReleaseRecordSnapshot>
}

export async function getServerReleaseContextGitHubState(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: ReleaseContextGitHubApiClient = createApiClient(),
): Promise<ReleaseContextGithubState> {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  }

  const [connection, installUrl] = await Promise.all([
    apiClient.getGitHubConnection(workspaceId, init).catch(() => null),
    apiClient
      .beginGitHubInstall(workspaceId, init)
      .then((result) => result.url)
      .catch(() => null),
  ])

  return {
    connection,
    installUrl,
  }
}

export function getSelectedReleaseContextSnapshot(
  initialReleaseRecords: ReleaseRecordSnapshot[],
  detailById: Record<string, ReleaseRecordSnapshot>,
  selectedId: string,
): ReleaseRecordSnapshot | null {
  if (!selectedId) {
    return null
  }

  return (
    detailById[selectedId] ??
    initialReleaseRecords.find((snapshot) => snapshot.releaseRecord.id === selectedId) ??
    null
  )
}

const sourceTypeLabels = {
  commit: "Commit",
  document: "Doc",
  pull_request: "PR",
  release: "Release",
  ticket: "Ticket",
} satisfies Record<ReleaseRecordSnapshot["evidenceBlocks"][number]["sourceType"], string>

const reviewStageLabels = {
  approval: "Approval",
  claim_check: "Claim check",
  draft: "Draft",
  intake: "Intake",
  publish_pack: "Publish pack",
} satisfies Record<ReleaseRecordSnapshot["releaseRecord"]["stage"], string>

function summarizeSourceTypes(snapshot: ReleaseRecordSnapshot) {
  const uniqueSourceTypes = Array.from(
    new Set(snapshot.evidenceBlocks.map((evidenceBlock) => sourceTypeLabels[evidenceBlock.sourceType])),
  )

  switch (uniqueSourceTypes.length) {
    case 0:
      return snapshot.sourceLinks.length > 0 ? `${snapshot.sourceLinks.length} links` : "No sources"
    case 1:
      return uniqueSourceTypes[0] as string
    case 2:
      return uniqueSourceTypes.join(" + ")
    default:
      return `${uniqueSourceTypes[0]} + ${uniqueSourceTypes.length - 1} more`
  }
}

function getWorstEvidenceState(snapshot: ReleaseRecordSnapshot) {
  if (snapshot.evidenceBlocks.some((evidenceBlock) => evidenceBlock.evidenceState === "missing")) {
    return "missing"
  }

  if (snapshot.evidenceBlocks.some((evidenceBlock) => evidenceBlock.evidenceState === "unsupported")) {
    return "unsupported"
  }

  if (snapshot.evidenceBlocks.some((evidenceBlock) => evidenceBlock.evidenceState === "stale")) {
    return "stale"
  }

  if (snapshot.evidenceBlocks.some((evidenceBlock) => evidenceBlock.evidenceState === "fresh")) {
    return "fresh"
  }

  return null
}

export function getReleaseContextFreshness(snapshot: ReleaseRecordSnapshot): ReleaseContextFreshness {
  const worstEvidenceState = getWorstEvidenceState(snapshot)

  if (!worstEvidenceState) {
    return "No evidence"
  }

  if (worstEvidenceState === "missing" || worstEvidenceState === "unsupported") {
    return "Stale"
  }

  if (worstEvidenceState === "stale") {
    return "Watch"
  }

  return "Fresh"
}

export function getReleaseContextReadiness(snapshot: ReleaseRecordSnapshot): ReleaseContextReadiness {
  if (
    snapshot.reviewStatuses.some((reviewStatus) => reviewStatus.state === "blocked") ||
    snapshot.evidenceBlocks.some((evidenceBlock) =>
      ["missing", "unsupported"].includes(evidenceBlock.evidenceState),
    )
  ) {
    return "At risk"
  }

  if (
    snapshot.claimCandidates.some((claimCandidate) => claimCandidate.status === "flagged") ||
    snapshot.reviewStatuses.some((reviewStatus) => reviewStatus.state === "pending") ||
    snapshot.evidenceBlocks.some((evidenceBlock) => evidenceBlock.evidenceState === "stale")
  ) {
    return "Needs review"
  }

  return "Ready"
}

function summarizeClaimCoverage(snapshot: ReleaseRecordSnapshot) {
  if (snapshot.claimCandidates.length === 0) {
    return snapshot.evidenceBlocks.length > 0 ? "Evidence only" : "No claims yet"
  }

  const linkedClaims = snapshot.claimCandidates.filter(
    (claimCandidate) => claimCandidate.evidenceBlockIds.length > 0,
  ).length

  return `${linkedClaims}/${snapshot.claimCandidates.length} claims linked`
}

function summarizeBlocker(snapshot: ReleaseRecordSnapshot) {
  const blockedReview = snapshot.reviewStatuses.find((reviewStatus) => reviewStatus.state === "blocked")

  if (blockedReview?.note) {
    return blockedReview.note
  }

  const flaggedClaim = snapshot.claimCandidates.find((claimCandidate) => claimCandidate.status === "flagged")

  if (flaggedClaim) {
    return flaggedClaim.sentence
  }

  if (snapshot.releaseRecord.summary) {
    return snapshot.releaseRecord.summary
  }

  return "Evidence is ready for release review."
}

export function buildReleaseContextQueueItem(
  snapshot: ReleaseRecordSnapshot,
): ReleaseContextQueueItem {
  return {
    blockerSummary: summarizeBlocker(snapshot),
    claimSummary: summarizeClaimCoverage(snapshot),
    evidenceCount: snapshot.evidenceBlocks.length,
    freshness: getReleaseContextFreshness(snapshot),
    id: snapshot.releaseRecord.id,
    readiness: getReleaseContextReadiness(snapshot),
    sourceSummary: summarizeSourceTypes(snapshot),
    stageLabel: reviewStageLabels[snapshot.releaseRecord.stage],
    summary: snapshot.releaseRecord.summary ?? "No intake summary attached yet.",
    title: snapshot.releaseRecord.title,
  }
}

export function buildReleaseContextMetrics(
  snapshots: ReleaseRecordSnapshot[],
): ReleaseContextMetrics {
  return {
    atRiskRecords: snapshots.filter((snapshot) => getReleaseContextReadiness(snapshot) === "At risk")
      .length,
    linkedClaims: snapshots.flatMap((snapshot) => snapshot.claimCandidates).filter(
      (claimCandidate) => claimCandidate.evidenceBlockIds.length > 0,
    ).length,
    recordsInQueue: snapshots.length,
    totalEvidence: snapshots.reduce(
      (sum, snapshot) => sum + snapshot.evidenceBlocks.length,
      0,
    ),
  }
}

export function buildReleaseContextEvidenceNotes(snapshot: ReleaseRecordSnapshot) {
  const evidenceNotes = snapshot.evidenceBlocks.map((evidenceBlock) => {
    const evidenceState =
      evidenceBlock.evidenceState.charAt(0).toUpperCase() + evidenceBlock.evidenceState.slice(1)

    return `${evidenceState}: ${evidenceBlock.title}`
  })
  const sourceLinkNotes = snapshot.sourceLinks.map(
    (sourceLink) => `Linked source: ${sourceLink.label}`,
  )

  if (evidenceNotes.length > 0 || sourceLinkNotes.length > 0) {
    return [...evidenceNotes, ...sourceLinkNotes]
  }

  return ["No evidence links are attached to this release record yet."]
}

export function buildReleaseContextReviewNotes(snapshot: ReleaseRecordSnapshot) {
  const reviewNotes = snapshot.reviewStatuses.map((reviewStatus) => {
    const stageLabel = reviewStageLabels[reviewStatus.stage]
    const stateLabel = reviewStatus.state.charAt(0).toUpperCase() + reviewStatus.state.slice(1)

    return `${stageLabel}: ${stateLabel}${reviewStatus.note ? ` — ${reviewStatus.note}` : ""}`
  })

  if (reviewNotes.length > 0) {
    return reviewNotes
  }

  const flaggedClaims = snapshot.claimCandidates
    .filter((claimCandidate) => claimCandidate.status === "flagged")
    .map((claimCandidate) => `Flagged claim: ${claimCandidate.sentence}`)

  if (flaggedClaims.length > 0) {
    return flaggedClaims
  }

  return ["No explicit review notes are attached to this release record yet."]
}

export async function getServerReleaseContextData(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: ReleaseContextApiClient = createApiClient(),
): Promise<ReleaseContextData> {
  const init = {
    headers: getForwardedAuthHeaders(requestHeaders),
  } satisfies RequestInit

  const releaseRecords = await apiClient.listReleaseRecords(workspaceId, init)
  const selectedId = releaseRecords[0]?.releaseRecord.id ?? null

  if (!selectedId) {
    return {
      releaseRecords,
      selectedId: null,
      selectedReleaseRecord: null,
    }
  }

  const selectedReleaseRecord = await apiClient.getReleaseRecord(workspaceId, selectedId, init)

  return {
    releaseRecords,
    selectedId,
    selectedReleaseRecord,
  }
}
