import type { ReleaseRecordSnapshot } from "./api/client"
import { createApiClient } from "./api/client"
import { getForwardedAuthHeaders } from "./auth/headers"
import { getReleaseContextReadiness } from "./dashboard/release-context"

type EvidenceLibraryApiClient = Pick<ReturnType<typeof createApiClient>, "listReleaseRecords">

export type EvidenceLibraryFreshness = "Fresh" | "Watch" | "Stale"

export type EvidenceLibraryLinkedRelease = {
  id: string
  readiness: ReturnType<typeof getReleaseContextReadiness>
  stageLabel: string
  title: string
}

export type EvidenceLibraryEntry = {
  captureTrail: string[]
  freshness: EvidenceLibraryFreshness
  id: string
  linkedReleaseCount: number
  linkedReleases: EvidenceLibraryLinkedRelease[]
  latestLinkedReleaseId: string
  nextChecks: string[]
  note: string
  providerLabel: string
  reviewNotes: string[]
  sourceRef: string
  sourceTypeLabel: string
  title: string
  updatedAt: string
}

export type EvidenceLibraryMetrics = {
  freshSources: number
  linkedReleaseRecords: number
  staleSources: number
  totalSources: number
}

export type EvidenceLibraryData = {
  entries: EvidenceLibraryEntry[]
  metrics: EvidenceLibraryMetrics
  priorityEntry: EvidenceLibraryEntry | null
}

type EvidenceAccumulator = {
  captures: Array<{ capturedAt: string; releaseTitle: string }>
  evidenceStates: Set<ReleaseRecordSnapshot["evidenceBlocks"][number]["evidenceState"]>
  latestBlock: ReleaseRecordSnapshot["evidenceBlocks"][number]
  linkedReleases: Map<string, EvidenceLibraryLinkedRelease>
  reviewNotes: string[]
}

const providerLabels = {
  github: "GitHub",
  linear: "Linear",
} satisfies Record<ReleaseRecordSnapshot["evidenceBlocks"][number]["provider"], string>

const sourceTypeLabels = {
  commit: "Commit",
  document: "Document",
  pull_request: "Pull request",
  release: "Release",
  ticket: "Ticket",
} satisfies Record<ReleaseRecordSnapshot["evidenceBlocks"][number]["sourceType"], string>

const releaseStageLabels = {
  draft: "Draft",
  intake: "Intake",
  publish_pack: "Publish pack",
  review: "Review",
} satisfies Record<ReleaseRecordSnapshot["releaseRecord"]["stage"], string>

const evidenceTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

function formatEvidenceTimestamp(value: string) {
  return `${evidenceTimestampFormatter.format(new Date(value))} UTC`
}

function toTimestamp(value: string) {
  return Date.parse(value)
}

function getEvidenceFreshness(
  states: Set<ReleaseRecordSnapshot["evidenceBlocks"][number]["evidenceState"]>,
): EvidenceLibraryFreshness {
  if (states.has("missing") || states.has("unsupported")) {
    return "Stale"
  }

  if (states.has("stale")) {
    return "Watch"
  }

  return "Fresh"
}

function buildEvidenceLibraryReviewNotes(
  snapshot: ReleaseRecordSnapshot,
  evidenceBlockId: string,
) {
  const notes: string[] = []

  for (const reviewStatus of snapshot.reviewStatuses) {
    if (reviewStatus.note) {
      const stageLabel = releaseStageLabels[reviewStatus.stage]
      const stateLabel =
        reviewStatus.state.charAt(0).toUpperCase() + reviewStatus.state.slice(1)
      notes.push(`${snapshot.releaseRecord.title}: ${stageLabel} ${stateLabel} — ${reviewStatus.note}`)
    }
  }

  for (const claimCandidate of snapshot.claimCandidates) {
    if (
      claimCandidate.status === "flagged" &&
      claimCandidate.evidenceBlockIds.includes(evidenceBlockId)
    ) {
      notes.push(`${snapshot.releaseRecord.title}: Flagged claim — ${claimCandidate.sentence}`)
    }
  }

  if (notes.length > 0) {
    return notes
  }

  return [`${snapshot.releaseRecord.title}: No explicit review note is attached to this evidence yet.`]
}

function buildEvidenceLibraryNextChecks(
  freshness: EvidenceLibraryFreshness,
  linkedReleaseCount: number,
) {
  if (freshness === "Stale") {
    return [
      "Refresh or replace this source before linked wording moves toward approval.",
      linkedReleaseCount > 1
        ? `This source is reused across ${linkedReleaseCount} release records, so stale proof can cascade quickly.`
        : "Keep the linked release blocked until this proof is current again.",
    ]
  }

  if (freshness === "Watch") {
    return [
      "Reconfirm this source before the next approval handoff closes.",
      linkedReleaseCount > 1
        ? "Keep wording aligned across every linked release before export."
        : "Use the linked release detail to confirm the sentence still matches current scope.",
    ]
  }

  return [
    "Reuse this source only when the linked release wording stays within the captured scope.",
    linkedReleaseCount > 1
      ? "When this source changes, update every linked release record together."
      : "Keep the linked release summary and this source bundle in sync before export.",
  ]
}

export function buildEvidenceLibraryData(
  snapshots: ReleaseRecordSnapshot[],
): EvidenceLibraryData {
  const evidenceByKey = new Map<string, EvidenceAccumulator>()

  for (const snapshot of snapshots) {
    const readiness = getReleaseContextReadiness(snapshot)
    const release = {
      id: snapshot.releaseRecord.id,
      readiness,
      stageLabel: releaseStageLabels[snapshot.releaseRecord.stage],
      title: snapshot.releaseRecord.title,
    } satisfies EvidenceLibraryLinkedRelease

    for (const evidenceBlock of snapshot.evidenceBlocks) {
      const key = `${evidenceBlock.provider}:${evidenceBlock.sourceType}:${evidenceBlock.sourceRef}`
      const current = evidenceByKey.get(key)

      if (current) {
        current.captures.push({
          capturedAt: evidenceBlock.capturedAt,
          releaseTitle: snapshot.releaseRecord.title,
        })
        current.evidenceStates.add(evidenceBlock.evidenceState)
        current.linkedReleases.set(release.id, release)
        current.reviewNotes.push(...buildEvidenceLibraryReviewNotes(snapshot, evidenceBlock.id))

        if (toTimestamp(current.latestBlock.capturedAt) < toTimestamp(evidenceBlock.capturedAt)) {
          current.latestBlock = evidenceBlock
        }

        continue
      }

      evidenceByKey.set(key, {
        captures: [
          {
            capturedAt: evidenceBlock.capturedAt,
            releaseTitle: snapshot.releaseRecord.title,
          },
        ],
        evidenceStates: new Set([evidenceBlock.evidenceState]),
        latestBlock: evidenceBlock,
        linkedReleases: new Map([[release.id, release]]),
        reviewNotes: buildEvidenceLibraryReviewNotes(snapshot, evidenceBlock.id),
      })
    }
  }

  const entries = Array.from(evidenceByKey.entries())
    .map(([id, accumulator]) => {
      const freshness = getEvidenceFreshness(accumulator.evidenceStates)
      const linkedReleases = Array.from(accumulator.linkedReleases.values()).sort((left, right) =>
        left.title.localeCompare(right.title),
      )
      const captureTrail = accumulator.captures
        .slice()
        .sort((left, right) => toTimestamp(right.capturedAt) - toTimestamp(left.capturedAt))
        .map(
          (capture) =>
            `${formatEvidenceTimestamp(capture.capturedAt)}: captured for ${capture.releaseTitle}.`,
        )
      const reviewNotes = Array.from(new Set(accumulator.reviewNotes))

      return {
        captureTrail,
        freshness,
        id,
        linkedReleaseCount: linkedReleases.length,
        linkedReleases,
        latestLinkedReleaseId: accumulator.latestBlock.releaseRecordId,
        nextChecks: buildEvidenceLibraryNextChecks(freshness, linkedReleases.length),
        note:
          accumulator.latestBlock.body?.trim() ||
          accumulator.latestBlock.title,
        providerLabel: providerLabels[accumulator.latestBlock.provider],
        reviewNotes,
        sourceRef: accumulator.latestBlock.sourceRef,
        sourceTypeLabel: sourceTypeLabels[accumulator.latestBlock.sourceType],
        title: accumulator.latestBlock.title,
        updatedAt: accumulator.latestBlock.capturedAt,
      } satisfies EvidenceLibraryEntry
    })
    .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt))

  const linkedReleaseRecords = new Set(
    entries.flatMap((entry) => entry.linkedReleases.map((release) => release.id)),
  ).size
  const priorityEntry =
    entries.find((entry) => entry.freshness === "Stale") ??
    entries.find((entry) => entry.freshness === "Watch") ??
    null

  return {
    entries,
    metrics: {
      freshSources: entries.filter((entry) => entry.freshness === "Fresh").length,
      linkedReleaseRecords,
      staleSources: entries.filter((entry) => entry.freshness === "Stale").length,
      totalSources: entries.length,
    },
    priorityEntry,
  }
}

export async function getServerEvidenceLibraryData(
  requestHeaders: Headers,
  workspaceId: string,
  apiClient: EvidenceLibraryApiClient = createApiClient(),
): Promise<EvidenceLibraryData> {
  const snapshots = await apiClient.listReleaseRecords(workspaceId, {
    headers: getForwardedAuthHeaders(requestHeaders),
  })

  return buildEvidenceLibraryData(snapshots)
}
