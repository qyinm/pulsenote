import type {
  ClaimCandidate,
  DraftRevision,
  ReviewStatus,
  User,
  WorkflowEvent,
  WorkspacePolicySettings,
} from "../domain/models.js"
import { createDefaultWorkspacePolicySettings } from "../domain/models.js"
import type { ReleaseRecordSnapshot } from "../foundation/store.js"
import {
  buildDraftTemplateFields,
  createDraftEvidenceRefs,
  getReleaseDraftTemplate,
  isReleaseDraftTemplateId,
  normalizeDraftTemplateFieldSnapshots,
  projectDraftBodiesFromFields,
  resolveDraftTemplateFieldKey,
} from "./draft-templates.js"
import type {
  CreateDraftInput,
  DraftScopedCommandInput,
  PublishPackSummary,
  ReleaseWorkflowBaseRecord,
  ReleaseWorkflowDetail,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  RequestReviewInput,
  ReviewSummary,
  UpdateDraftInput,
  WorkflowAllowedAction,
  WorkflowReadiness,
} from "./models.js"
import type { ReleaseWorkflowStore } from "./store.js"

type DraftComposerResult = {
  changelogBody: string
  releaseNotesBody: string
}

type ReleaseWorkflowServiceDependencies = {
  composeDraft?: (releaseSnapshot: ReleaseRecordSnapshot) => Promise<DraftComposerResult>
}

export type ReleaseWorkflowService = ReturnType<typeof createReleaseWorkflowService>

export class ReleaseWorkflowNotFoundError extends Error {
  constructor(releaseRecordId: string, workspaceId: string) {
    super(`Release record ${releaseRecordId} was not found in workspace ${workspaceId}`)
    this.name = "ReleaseWorkflowNotFoundError"
  }
}

export class DraftRevisionNotFoundError extends Error {
  constructor(draftRevisionId: string) {
    super(`Draft revision ${draftRevisionId} was not found`)
    this.name = "DraftRevisionNotFoundError"
  }
}

export class StaleDraftRevisionError extends Error {
  constructor() {
    super("The release workflow changed since this page loaded. Refresh and try again.")
    this.name = "StaleDraftRevisionError"
  }
}

export class InvalidStageTransitionError extends Error {
  constructor(stage: string, action: string) {
    super(`Cannot ${action} while the release is in ${stage}`)
    this.name = "InvalidStageTransitionError"
  }
}

export class ReviewRequestRequiredError extends Error {
  constructor() {
    super("Review must be requested before this draft can be approved")
    this.name = "ReviewRequestRequiredError"
  }
}

export class ReviewerAssignmentRequiredError extends Error {
  constructor() {
    super("Select a workspace reviewer before requesting review")
    this.name = "ReviewerAssignmentRequiredError"
  }
}

export class ReviewerAssignmentNotAllowedError extends Error {
  constructor(reviewerUserId: string, workspaceId: string) {
    super(`Reviewer ${reviewerUserId} does not belong to workspace ${workspaceId}`)
    this.name = "ReviewerAssignmentNotAllowedError"
  }
}

export class ReviewerApprovalRequiredError extends Error {
  constructor() {
    super("Only the assigned reviewer can approve this draft")
    this.name = "ReviewerApprovalRequiredError"
  }
}

export class ApprovedDraftRequiredError extends Error {
  constructor() {
    super("An approved draft is required before creating a publish pack")
    this.name = "ApprovedDraftRequiredError"
  }
}

export class InvalidDraftTemplateError extends Error {
  constructor(templateId: string) {
    super(`Draft template ${templateId} is not supported`)
    this.name = "InvalidDraftTemplateError"
  }
}

function buildDraftLines(releaseSnapshot: ReleaseRecordSnapshot) {
  const claimLines = releaseSnapshot.claimCandidates.map((claimCandidate: ClaimCandidate) =>
    claimCandidate.sentence.trim(),
  )
  const evidenceLines = releaseSnapshot.evidenceBlocks.map((evidenceBlock) => evidenceBlock.title.trim())
  const lines = [...claimLines, ...evidenceLines].filter((line) => line.length > 0)
  const uniqueLines = Array.from(new Set(lines))

  return uniqueLines.slice(0, 5)
}

async function composeDraftFromReleaseSnapshot(releaseSnapshot: ReleaseRecordSnapshot) {
  const lines = buildDraftLines(releaseSnapshot)
  const summary = releaseSnapshot.releaseRecord.summary ?? "Release context is ready for review."

  return {
    changelogBody: [
      `## ${releaseSnapshot.releaseRecord.title}`,
      summary,
      "",
      "### Included changes",
      ...(lines.length > 0 ? lines.map((line) => `- ${line}`) : ["- Review linked evidence before publishing."]),
    ].join("\n"),
    releaseNotesBody: [
      releaseSnapshot.releaseRecord.title,
      "",
      summary,
      "",
      "What changed",
      ...(lines.length > 0 ? lines.map((line) => `- ${line}`) : ["- Review linked evidence before publishing."]),
    ].join("\n"),
  } satisfies DraftComposerResult
}

function getReviewStatusMap(reviewStatuses: ReviewStatus[]) {
  return Object.fromEntries(reviewStatuses.map((reviewStatus) => [reviewStatus.stage, reviewStatus])) as Partial<
    Record<ReviewStatus["stage"], ReviewStatus>
  >
}

function buildReviewSummary(
  currentDraft: Pick<DraftRevision, "id"> | null,
  reviewStatusesByStage: Partial<Record<ReviewStatus["stage"], ReviewStatus>>,
  workflowEvents: WorkflowEvent[],
  userById: Map<string, User>,
): ReviewSummary {
  if (!currentDraft) {
    return {
      draftRevisionId: null,
      note: null,
      ownerName: null,
      ownerUserId: null,
      requestedByName: null,
      requestedByUserId: null,
      state: "not_requested",
      updatedAt: null,
    }
  }

  const reviewEventTypes = new Set(["review_requested", "draft_approved", "draft_reopened"])
  const getReviewEventPriority = (workflowEvent: WorkflowEvent) => {
    switch (workflowEvent.type) {
      case "review_requested":
        return 1
      case "draft_approved":
        return 2
      case "draft_reopened":
        return 3
      default:
        return 0
    }
  }

  const latestReviewEvent = [...workflowEvents]
    .filter(
      (workflowEvent) =>
        workflowEvent.draftRevisionId === currentDraft.id && reviewEventTypes.has(workflowEvent.type),
    )
    .sort((left, right) => {
      const createdAtComparison = right.createdAt.localeCompare(left.createdAt)
      if (createdAtComparison !== 0) return createdAtComparison
      return getReviewEventPriority(right) - getReviewEventPriority(left)
    })[0] ?? null

  const latestReviewRequestEvent = [...workflowEvents]
    .filter(
      (workflowEvent) =>
        workflowEvent.draftRevisionId === currentDraft.id && workflowEvent.type === "review_requested",
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null

  const reviewReviewStatus = reviewStatusesByStage.review ?? null
  const ownerId = reviewReviewStatus?.ownerUserId
  const owner = ownerId ? userById.get(ownerId) ?? null : null
  const requesterId = latestReviewRequestEvent?.actorUserId
  const requestedBy = requesterId ? userById.get(requesterId) ?? null : null

  if (!latestReviewEvent) {
    return {
      draftRevisionId: currentDraft.id,
      note: null,
      ownerName: null,
      ownerUserId: null,
      requestedByName: null,
      requestedByUserId: null,
      state: "not_requested",
      updatedAt: null,
    }
  }

  if (latestReviewEvent.type === "draft_reopened") {
    return {
      draftRevisionId: currentDraft.id,
      note: latestReviewEvent.note,
      ownerName: buildHistoryActorName(owner),
      ownerUserId: reviewReviewStatus?.ownerUserId ?? null,
      requestedByName: buildHistoryActorName(requestedBy),
      requestedByUserId: latestReviewRequestEvent?.actorUserId ?? null,
      state: "reopened",
      updatedAt: latestReviewEvent.createdAt,
    }
  }

  if (latestReviewEvent.type === "draft_approved") {
    return {
      draftRevisionId: currentDraft.id,
      note: reviewReviewStatus?.note ?? latestReviewEvent.note,
      ownerName: buildHistoryActorName(owner),
      ownerUserId: reviewReviewStatus?.ownerUserId ?? null,
      requestedByName: buildHistoryActorName(requestedBy),
      requestedByUserId: latestReviewRequestEvent?.actorUserId ?? null,
      state: "approved",
      updatedAt: reviewReviewStatus?.updatedAt ?? latestReviewEvent.createdAt,
    }
  }

  return {
    draftRevisionId: currentDraft.id,
    note: reviewReviewStatus?.note ?? latestReviewEvent.note,
    ownerName: buildHistoryActorName(owner),
    ownerUserId: reviewReviewStatus?.ownerUserId ?? null,
    requestedByName: buildHistoryActorName(requestedBy),
    requestedByUserId: latestReviewRequestEvent?.actorUserId ?? null,
    state: "pending",
    updatedAt: reviewReviewStatus?.updatedAt ?? latestReviewEvent.createdAt,
  }
}

function buildPublishPackSummary(
  currentDraft: Pick<DraftRevision, "id"> | null,
  latestPublishPackExport: ReleaseWorkflowBaseRecord["latestPublishPackExport"],
  reviewSummary: ReviewSummary,
): PublishPackSummary {
  if (!currentDraft) {
    return {
      draftRevisionId: null,
      exportedByName: null,
      exportedByUserId: null,
      includedEvidenceCount: 0,
      includedSourceLinkCount: 0,
      includesEvidenceLinks: false,
      includesSourceLinks: false,
      exportId: null,
      exportedAt: null,
      state: "not_ready",
    }
  }

  if (latestPublishPackExport && latestPublishPackExport.draftRevisionId === currentDraft.id) {
    return {
      draftRevisionId: currentDraft.id,
      exportedByName: latestPublishPackExport.contextSnapshot.exportedByName,
      exportedByUserId: latestPublishPackExport.contextSnapshot.exportedByUserId,
      includedEvidenceCount: latestPublishPackExport.evidenceSnapshots.length,
      includedSourceLinkCount: latestPublishPackExport.sourceSnapshots.length,
      includesEvidenceLinks: latestPublishPackExport.policySnapshot.includeEvidenceLinksInExport,
      includesSourceLinks: latestPublishPackExport.policySnapshot.includeSourceLinksInExport,
      exportId: latestPublishPackExport.id,
      exportedAt: latestPublishPackExport.createdAt,
      state: "exported",
    }
  }

  if (reviewSummary.state === "approved") {
    return {
      draftRevisionId: currentDraft.id,
      exportedByName: null,
      exportedByUserId: null,
      includedEvidenceCount: 0,
      includedSourceLinkCount: 0,
      includesEvidenceLinks: false,
      includesSourceLinks: false,
      exportId: null,
      exportedAt: null,
      state: "ready",
    }
  }

  return {
    draftRevisionId: currentDraft.id,
    exportedByName: null,
    exportedByUserId: null,
    includedEvidenceCount: 0,
    includedSourceLinkCount: 0,
    includesEvidenceLinks: false,
    includesSourceLinks: false,
    exportId: null,
    exportedAt: null,
    state: "not_ready",
  }
}

function buildPublishPackArtifact(
  latestPublishPackExport: ReleaseWorkflowBaseRecord["latestPublishPackExport"],
) {
  if (!latestPublishPackExport) {
    return null
  }

  return {
    changelogBody: latestPublishPackExport.changelogBody,
    context: latestPublishPackExport.contextSnapshot,
    evidenceSnapshots: latestPublishPackExport.evidenceSnapshots,
    exportId: latestPublishPackExport.id,
    exportedAt: latestPublishPackExport.createdAt,
    policy: latestPublishPackExport.policySnapshot,
    releaseNotesBody: latestPublishPackExport.releaseNotesBody,
    sourceSnapshots: latestPublishPackExport.sourceSnapshots,
  }
}

function buildAllowedActions(input: {
  currentDraft: Pick<DraftRevision, "id"> | null
  reviewSummary: ReviewSummary
  publishPackSummary: PublishPackSummary
  stage: ReleaseRecordSnapshot["releaseRecord"]["stage"]
}): WorkflowAllowedAction[] {
  const allowedActions: WorkflowAllowedAction[] = []

  if (input.stage === "intake" || input.stage === "draft") {
    allowedActions.push("create_draft")
  }

  if (input.stage === "draft" && input.currentDraft) {
    allowedActions.push("request_review")
  }

  if (
    (input.stage === "review" || input.stage === "publish_pack") &&
    input.currentDraft
  ) {
    allowedActions.push("reopen_draft")
  }

  if (input.stage === "review" && input.currentDraft && input.reviewSummary.state === "pending") {
    allowedActions.push("approve_draft")
  }

  if (
    input.stage === "publish_pack" &&
    input.currentDraft &&
    input.reviewSummary.state === "approved" &&
    input.publishPackSummary.state !== "exported"
  ) {
    allowedActions.push("create_publish_pack")
  }

  return allowedActions
}

function buildReadiness(input: {
  allowedActions: WorkflowAllowedAction[]
  publishPackSummary: PublishPackSummary
}): WorkflowReadiness {
  if (input.publishPackSummary.state === "exported" || input.allowedActions.length > 0) {
    return "ready"
  }

  return "attention"
}

function buildBaseRecord(input: {
  currentDraft: DraftRevision | null
  latestPublishPackExport: ReleaseWorkflowBaseRecord["latestPublishPackExport"]
  releaseSnapshot: ReleaseRecordSnapshot
}): ReleaseWorkflowBaseRecord {
  return {
    currentDraft: input.currentDraft,
    latestPublishPackExport: input.latestPublishPackExport,
    releaseSnapshot: input.releaseSnapshot,
    reviewStatusesByStage: getReviewStatusMap(input.releaseSnapshot.reviewStatuses),
  }
}

function buildWorkflowDetailFromBaseRecord(
  baseRecord: ReleaseWorkflowBaseRecord,
  workflowEvents: WorkflowEvent[],
  userById: Map<string, User>,
): ReleaseWorkflowDetail {
  const reviewSummary = buildReviewSummary(
    baseRecord.currentDraft,
    baseRecord.reviewStatusesByStage,
    workflowEvents,
    userById,
  )
  const publishPackSummary = buildPublishPackSummary(
    baseRecord.currentDraft,
    baseRecord.latestPublishPackExport,
    reviewSummary,
  )
  const publishPackArtifact = buildPublishPackArtifact(baseRecord.latestPublishPackExport)
  const allowedActions = buildAllowedActions({
    currentDraft: baseRecord.currentDraft,
    publishPackSummary,
    reviewSummary,
    stage: baseRecord.releaseSnapshot.releaseRecord.stage,
  })
  const readiness = buildReadiness({
    allowedActions,
    publishPackSummary,
  })

  return {
    allowedActions,
    currentDraft:
      baseRecord.currentDraft === null
        ? null
        : {
            changelogBody: baseRecord.currentDraft.changelogBody,
            createdAt: baseRecord.currentDraft.createdAt,
            createdByUserId: baseRecord.currentDraft.createdByUserId,
            evidenceRefs: baseRecord.currentDraft.evidenceRefs,
            fieldSnapshots: baseRecord.currentDraft.fieldSnapshots,
            id: baseRecord.currentDraft.id,
            releaseNotesBody: baseRecord.currentDraft.releaseNotesBody,
            templateId: baseRecord.currentDraft.templateId,
            templateLabel: baseRecord.currentDraft.templateLabel,
            templateVersion: baseRecord.currentDraft.templateVersion,
            version: baseRecord.currentDraft.version,
          },
    evidenceBlocks: baseRecord.releaseSnapshot.evidenceBlocks,
    latestPublishPackArtifact: publishPackArtifact,
    latestPublishPackSummary: publishPackSummary,
    readiness,
    releaseRecord: baseRecord.releaseSnapshot.releaseRecord,
    reviewStatuses: baseRecord.releaseSnapshot.reviewStatuses,
    reviewSummary,
    sourceLinks: baseRecord.releaseSnapshot.sourceLinks,
  }
}

function detailToListItem(detail: ReleaseWorkflowDetail): ReleaseWorkflowListItem {
  return {
    allowedActions: detail.allowedActions,
    currentDraft:
      detail.currentDraft === null
        ? null
        : {
            createdAt: detail.currentDraft.createdAt,
            id: detail.currentDraft.id,
            version: detail.currentDraft.version,
          },
    evidenceCount: detail.evidenceBlocks.length,
    latestPublishPackSummary: detail.latestPublishPackSummary,
    readiness: detail.readiness,
    releaseRecord: {
      compareRange: detail.releaseRecord.compareRange,
      createdAt: detail.releaseRecord.createdAt,
      id: detail.releaseRecord.id,
      preferredDraftTemplateId: detail.releaseRecord.preferredDraftTemplateId,
      stage: detail.releaseRecord.stage,
      summary: detail.releaseRecord.summary,
      title: detail.releaseRecord.title,
      updatedAt: detail.releaseRecord.updatedAt,
      workspaceId: detail.releaseRecord.workspaceId,
    },
    reviewSummary: detail.reviewSummary,
    sourceLinkCount: detail.sourceLinks.length,
  }
}

function buildHistoryEventLabel(workflowEvent: WorkflowEvent): string {
  switch (workflowEvent.type) {
    case "draft_created":
      return "Draft created"
    case "draft_updated":
      return "Draft updated"
    case "review_requested":
      return "Review requested"
    case "draft_approved":
      return "Draft approved"
    case "draft_reopened":
      return "Draft reopened"
    case "publish_pack_created":
      return "Publish pack created"
  }
}

function buildHistoryEventOutcome(
  workflowEvent: WorkflowEvent,
): ReleaseWorkflowHistoryEntry["outcome"] {
  switch (workflowEvent.type) {
    case "draft_created":
    case "draft_updated":
      return "revision"
    case "review_requested":
      return "progressed"
    case "draft_approved":
      return "signed_off"
    case "draft_reopened":
      return "blocked"
    case "publish_pack_created":
      return "signed_off"
  }
}

function buildHistoryActorName(user: User | null | undefined) {
  if (!user) {
    return null
  }

  const fullName = user.fullName?.trim()
  return fullName && fullName.length > 0 ? fullName : user.email
}

function buildPublishPackExportContextSnapshot(input: {
  actor: User | null
  actorUserId: string | null
  reviewSummary: ReviewSummary
}) {
  return {
    approvalNote: input.reviewSummary.note,
    approvalOwnerName: input.reviewSummary.ownerName,
    approvalOwnerUserId: input.reviewSummary.ownerUserId,
    approvalRequestedByName: input.reviewSummary.requestedByName,
    approvalRequestedByUserId: input.reviewSummary.requestedByUserId,
    approvalState: input.reviewSummary.state,
    exportedByName: buildHistoryActorName(input.actor),
    exportedByUserId: input.actorUserId,
  }
}

function buildPublishPackExportEvidenceSnapshots(releaseSnapshot: ReleaseRecordSnapshot) {
  return releaseSnapshot.evidenceBlocks.map((evidenceBlock) => ({
    capturedAt: evidenceBlock.capturedAt,
    evidenceBlockId: evidenceBlock.id,
    evidenceState: evidenceBlock.evidenceState,
    sourceRef: evidenceBlock.sourceRef,
    sourceType: evidenceBlock.sourceType,
    title: evidenceBlock.title,
  }))
}

function buildPublishPackExportPolicySnapshot(
  policy: Pick<WorkspacePolicySettings, "includeEvidenceLinksInExport" | "includeSourceLinksInExport">,
) {
  return {
    includeEvidenceLinksInExport: policy.includeEvidenceLinksInExport,
    includeSourceLinksInExport: policy.includeSourceLinksInExport,
  }
}

function buildPublishPackExportSourceSnapshots(releaseSnapshot: ReleaseRecordSnapshot) {
  return releaseSnapshot.sourceLinks.map((sourceLink) => ({
    label: sourceLink.label,
    sourceLinkId: sourceLink.id,
    url: sourceLink.url,
  }))
}

function sanitizeDraftEvidenceRefs(
  evidenceRefs: DraftRevision["evidenceRefs"],
  releaseSnapshot: ReleaseRecordSnapshot,
  draftTemplate: ReturnType<typeof getReleaseDraftTemplate>,
) {
  const evidenceBlockIds = new Set(releaseSnapshot.evidenceBlocks.map((evidenceBlock) => evidenceBlock.id))
  const sourceLinkIds = new Set(releaseSnapshot.sourceLinks.map((sourceLink) => sourceLink.id))
  const templateFieldKeys = new Set<string>(draftTemplate.fields.map((field) => field.key))

  return evidenceRefs.flatMap((evidenceRef) => {
    const canonicalFieldKey = resolveDraftTemplateFieldKey(draftTemplate, evidenceRef.fieldKey)

    if (!templateFieldKeys.has(canonicalFieldKey)) {
      return []
    }

    if (!evidenceBlockIds.has(evidenceRef.evidenceBlockId)) {
      return []
    }

    if (evidenceRef.sourceLinkId && !sourceLinkIds.has(evidenceRef.sourceLinkId)) {
      return []
    }

    return [
      {
        ...evidenceRef,
        fieldKey: canonicalFieldKey,
      },
    ]
  })
}

function collectWorkflowUserIds(
  releaseSnapshots: ReleaseRecordSnapshot[],
  workflowEvents: WorkflowEvent[],
) {
  return Array.from(
    new Set(
      [
        ...releaseSnapshots.flatMap((releaseSnapshot) =>
          releaseSnapshot.reviewStatuses
            .map((reviewStatus) => reviewStatus.ownerUserId)
            .filter((ownerUserId): ownerUserId is string => ownerUserId !== null),
        ),
        ...workflowEvents
          .map((workflowEvent) => workflowEvent.actorUserId)
          .filter((actorUserId): actorUserId is string => actorUserId !== null),
      ],
    ),
  )
}

function compareWorkflowHistoryEntries(
  left: ReleaseWorkflowHistoryEntry,
  right: ReleaseWorkflowHistoryEntry,
) {
  const historyEventPriority = (entry: ReleaseWorkflowHistoryEntry) => {
    switch (entry.eventType) {
      case "draft_created":
        return 1
      case "draft_updated":
        return 2
      case "review_requested":
        return 3
      case "draft_approved":
        return 4
      case "draft_reopened":
        return 5
      case "publish_pack_created":
        return 6
    }
  }
  const createdAtComparison = right.createdAt.localeCompare(left.createdAt)

  if (createdAtComparison !== 0) {
    return createdAtComparison
  }

  const priorityComparison = historyEventPriority(right) - historyEventPriority(left)

  if (priorityComparison !== 0) {
    return priorityComparison
  }

  return right.id.localeCompare(left.id)
}

function assertExpectedDraftRevision(
  currentDraft: DraftRevision | null,
  expectedDraftRevisionId: string | null,
) {
  if ((currentDraft?.id ?? null) !== expectedDraftRevisionId) {
    throw new StaleDraftRevisionError()
  }
}

export function createReleaseWorkflowService(
  store: ReleaseWorkflowStore,
  dependencies: ReleaseWorkflowServiceDependencies = {},
) {
  const composeDraft = dependencies.composeDraft ?? composeDraftFromReleaseSnapshot

  async function getWorkflowResources(
    workflowStore: ReleaseWorkflowStore,
    workspaceId: string,
    releaseRecordId: string,
  ) {
    const releaseSnapshot = await workflowStore.getReleaseSnapshot(workspaceId, releaseRecordId)

    if (!releaseSnapshot) {
      throw new ReleaseWorkflowNotFoundError(releaseRecordId, workspaceId)
    }

    const currentDraft = await workflowStore.getLatestDraftRevision(releaseRecordId)
    const latestPublishPackExport = (
      await workflowStore.listLatestPublishPackExportsByReleaseRecordIds([releaseRecordId])
    )[0] ?? null
    const workflowEvents = await workflowStore.listWorkflowEventsByReleaseRecordIds([releaseRecordId])
    const policy =
      (await workflowStore.getWorkspacePolicySettings(workspaceId)) ??
      createDefaultWorkspacePolicySettings(workspaceId)

    return {
      baseRecord: buildBaseRecord({
        currentDraft,
        latestPublishPackExport,
        releaseSnapshot,
      }),
      currentDraft,
      policy,
      releaseSnapshot,
      workflowEvents,
    }
  }

  async function listHistoryEntriesForReleaseRecords(
    workflowStore: ReleaseWorkflowStore,
    releaseSnapshots: ReleaseRecordSnapshot[],
  ): Promise<ReleaseWorkflowHistoryEntry[]> {
    if (releaseSnapshots.length === 0) {
      return []
    }

    const releaseRecordIds = releaseSnapshots.map((releaseSnapshot) => releaseSnapshot.releaseRecord.id)
    const [workflowEvents, draftRevisions, publishPackExports] = await Promise.all([
      workflowStore.listWorkflowEventsByReleaseRecordIds(releaseRecordIds),
      workflowStore.listDraftRevisionsByReleaseRecordIds(releaseRecordIds),
      workflowStore.listPublishPackExportsByReleaseRecordIds(releaseRecordIds),
    ])

    if (workflowEvents.length === 0) {
      return []
    }

    const draftRevisionIds = draftRevisions.map((draftRevision) => draftRevision.id)
    const users = await workflowStore.listUsersByIds(
      Array.from(
        new Set(
          workflowEvents
            .map((workflowEvent) => workflowEvent.actorUserId)
            .filter((actorUserId): actorUserId is string => actorUserId !== null),
        ),
      ),
    )

    const releaseSnapshotByReleaseRecordId = new Map(
      releaseSnapshots.map((releaseSnapshot) => [releaseSnapshot.releaseRecord.id, releaseSnapshot]),
    )
    const draftRevisionById = new Map(
      draftRevisions.map((draftRevision) => [draftRevision.id, draftRevision]),
    )
    const publishPackExportByDraftRevisionId = new Map(
      publishPackExports.map((publishPackExport) => [publishPackExport.draftRevisionId, publishPackExport]),
    )
    const userById = new Map(users.map((user) => [user.id, user]))

    return workflowEvents
      .map((workflowEvent) => {
        const releaseSnapshot = releaseSnapshotByReleaseRecordId.get(workflowEvent.releaseRecordId)

        if (!releaseSnapshot) {
          return null
        }

        const draftRevision =
          workflowEvent.draftRevisionId === null
            ? null
            : draftRevisionById.get(workflowEvent.draftRevisionId) ?? null
        const actor =
          workflowEvent.actorUserId === null ? null : userById.get(workflowEvent.actorUserId) ?? null
        const publishPackExport =
          draftRevision === null ? null : publishPackExportByDraftRevisionId.get(draftRevision.id) ?? null

        return {
          actorName: buildHistoryActorName(actor),
          actorUserId: workflowEvent.actorUserId,
          createdAt: workflowEvent.createdAt,
          draftRevisionId: workflowEvent.draftRevisionId,
          draftVersion: draftRevision?.version ?? null,
          eventLabel: buildHistoryEventLabel(workflowEvent),
          eventType: workflowEvent.type,
          evidenceCount: releaseSnapshot.evidenceBlocks.length,
          id: workflowEvent.id,
          note: workflowEvent.note,
          outcome: buildHistoryEventOutcome(workflowEvent),
          publishPackExportId:
            workflowEvent.type === "publish_pack_created" ? (publishPackExport?.id ?? null) : null,
          releaseRecordId: workflowEvent.releaseRecordId,
          releaseTitle: releaseSnapshot.releaseRecord.title,
          sourceLinkCount: releaseSnapshot.sourceLinks.length,
          stage: workflowEvent.stage,
        } satisfies ReleaseWorkflowHistoryEntry
      })
      .filter((entry): entry is ReleaseWorkflowHistoryEntry => entry !== null)
      .sort(compareWorkflowHistoryEntries)
  }

  const service = {
    store,

    async listReleaseWorkflow(workspaceId: string): Promise<ReleaseWorkflowListItem[]> {
      const [releaseSnapshots, persistedPolicy] = await Promise.all([
        store.listReleaseSnapshots(workspaceId),
        store.getWorkspacePolicySettings(workspaceId),
      ])
      const policy = persistedPolicy ?? createDefaultWorkspacePolicySettings(workspaceId)

      if (releaseSnapshots.length === 0) {
        return []
      }

      const releaseRecordIds = releaseSnapshots.map((releaseSnapshot) => releaseSnapshot.releaseRecord.id)
      const [latestDrafts, latestPublishPackExports, workflowEvents] = await Promise.all([
        store.listLatestDraftRevisionsByReleaseRecordIds(releaseRecordIds),
        store.listLatestPublishPackExportsByReleaseRecordIds(releaseRecordIds),
        store.listWorkflowEventsByReleaseRecordIds(releaseRecordIds),
      ])
      const users = await store.listUsersByIds(collectWorkflowUserIds(releaseSnapshots, workflowEvents))
      const latestDraftByReleaseRecordId = new Map(
        latestDrafts.map((draftRevision) => [draftRevision.releaseRecordId, draftRevision]),
      )
      const latestPublishPackByReleaseRecordId = new Map(
        latestPublishPackExports.map((publishPackExport) => [publishPackExport.releaseRecordId, publishPackExport]),
      )
      const workflowEventsByReleaseRecordId = new Map<string, WorkflowEvent[]>()

      for (const workflowEvent of workflowEvents) {
        const releaseWorkflowEvents = workflowEventsByReleaseRecordId.get(workflowEvent.releaseRecordId) ?? []
        releaseWorkflowEvents.push(workflowEvent)
        workflowEventsByReleaseRecordId.set(workflowEvent.releaseRecordId, releaseWorkflowEvents)
      }
      const userById = new Map(users.map((user) => [user.id, user]))

      return releaseSnapshots.map((releaseSnapshot) => {
        const currentDraft = latestDraftByReleaseRecordId.get(releaseSnapshot.releaseRecord.id) ?? null
        const detail = buildWorkflowDetailFromBaseRecord(
          buildBaseRecord({
            currentDraft,
            latestPublishPackExport:
              latestPublishPackByReleaseRecordId.get(releaseSnapshot.releaseRecord.id) ?? null,
            releaseSnapshot,
          }),
          workflowEventsByReleaseRecordId.get(releaseSnapshot.releaseRecord.id) ?? [],
          userById,
        )

        return detailToListItem(detail)
      })
    },

    async getReleaseWorkflowDetail(
      workspaceId: string,
      releaseRecordId: string,
    ): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, workspaceId, releaseRecordId)
      const users = await store.listUsersByIds(
        collectWorkflowUserIds([resources.releaseSnapshot], resources.workflowEvents),
      )
      return buildWorkflowDetailFromBaseRecord(
        resources.baseRecord,
        resources.workflowEvents,
        new Map(users.map((user) => [user.id, user])),
      )
    },

    async listReleaseWorkflowHistory(workspaceId: string): Promise<ReleaseWorkflowHistoryEntry[]> {
      const releaseSnapshots = await store.listReleaseSnapshots(workspaceId)
      return listHistoryEntriesForReleaseRecords(store, releaseSnapshots)
    },

    async getReleaseWorkflowHistory(
      workspaceId: string,
      releaseRecordId: string,
    ): Promise<ReleaseWorkflowHistoryEntry[]> {
      const releaseSnapshot = await store.getReleaseSnapshot(workspaceId, releaseRecordId)

      if (!releaseSnapshot) {
        throw new ReleaseWorkflowNotFoundError(releaseRecordId, workspaceId)
      }

      return listHistoryEntriesForReleaseRecords(store, [releaseSnapshot])
    },

    async createDraft(input: CreateDraftInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)

      if (
        resources.releaseSnapshot.releaseRecord.stage !== "intake" &&
        resources.releaseSnapshot.releaseRecord.stage !== "draft"
      ) {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "create a draft")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedLatestDraftRevisionId)

      const requestedTemplateId =
        input.templateId?.trim() ??
        resources.releaseSnapshot.releaseRecord.preferredDraftTemplateId ??
        ""

      if (requestedTemplateId.length > 0 && !isReleaseDraftTemplateId(requestedTemplateId)) {
        throw new InvalidDraftTemplateError(requestedTemplateId)
      }

      const draftContent =
        input.changelogBody && input.releaseNotesBody
          ? {
              changelogBody: input.changelogBody,
              releaseNotesBody: input.releaseNotesBody,
            }
          : await composeDraft(resources.releaseSnapshot)
      const draftTemplate = getReleaseDraftTemplate(requestedTemplateId)
      const fieldSnapshots = buildDraftTemplateFields({
        changelogBody: draftContent.changelogBody,
        releaseNotesBody: draftContent.releaseNotesBody,
        releaseSnapshot: resources.releaseSnapshot,
        template: draftTemplate,
      })
      const projectedDraftBodies = projectDraftBodiesFromFields(draftTemplate, fieldSnapshots)
      const evidenceRefs = createDraftEvidenceRefs(resources.releaseSnapshot, fieldSnapshots)

      await store.transaction(async (transactionStore) => {
        const draftRevision = await transactionStore.createDraftRevision({
          changelogBody: projectedDraftBodies.changelogBody,
          createdByUserId: input.actorUserId,
          evidenceRefs,
          fieldSnapshots,
          releaseNotesBody: projectedDraftBodies.releaseNotesBody,
          releaseRecordId: input.releaseRecordId,
          templateId: draftTemplate.id,
          templateLabel: draftTemplate.label,
          templateVersion: draftTemplate.version,
          version: (resources.currentDraft?.version ?? 0) + 1,
        })

        await transactionStore.updateReleaseRecordStage(input.releaseRecordId, "draft")
        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: draftRevision.id,
          note: null,
          releaseRecordId: input.releaseRecordId,
          stage: "draft",
          type: "draft_created",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },

    async updateDraft(input: UpdateDraftInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)

      if (resources.releaseSnapshot.releaseRecord.stage !== "draft") {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "update the draft")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)
      const currentDraft = resources.currentDraft!

      const draftTemplate = getReleaseDraftTemplate(currentDraft.templateId)
      const fieldSnapshots = normalizeDraftTemplateFieldSnapshots(
        draftTemplate,
        input.fieldSnapshots,
        currentDraft.fieldSnapshots,
      )
      const projectedDraftBodies = projectDraftBodiesFromFields(draftTemplate, fieldSnapshots)
      const evidenceRefs = sanitizeDraftEvidenceRefs(
        currentDraft.evidenceRefs,
        resources.releaseSnapshot,
        draftTemplate,
      )

      await store.transaction(async (transactionStore) => {
        const draftRevision = await transactionStore.createDraftRevision({
          changelogBody: projectedDraftBodies.changelogBody,
          createdByUserId: input.actorUserId,
          evidenceRefs,
          fieldSnapshots,
          releaseNotesBody: projectedDraftBodies.releaseNotesBody,
          releaseRecordId: input.releaseRecordId,
          templateId: currentDraft.templateId,
          templateLabel: currentDraft.templateLabel,
          templateVersion: currentDraft.templateVersion,
          version: currentDraft.version + 1,
        })

        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: draftRevision.id,
          note: "Draft fields updated",
          releaseRecordId: input.releaseRecordId,
          stage: "draft",
          type: "draft_updated",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },

    async requestReview(input: RequestReviewInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)
      const reviewerUserId = input.reviewerUserId?.trim() ?? ""

      if (resources.policy.requireReviewerAssignment && reviewerUserId.length === 0) {
        throw new ReviewerAssignmentRequiredError()
      }

      if (reviewerUserId.length > 0) {
        const reviewerMembership = await store.findWorkspaceMembership(input.workspaceId, reviewerUserId)

        if (!reviewerMembership) {
          throw new ReviewerAssignmentNotAllowedError(reviewerUserId, input.workspaceId)
        }
      }

      if (resources.releaseSnapshot.releaseRecord.stage !== "draft") {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "request review")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)

      if (!resources.currentDraft) {
        throw new DraftRevisionNotFoundError(input.expectedDraftRevisionId)
      }

      await store.transaction(async (transactionStore) => {
        await transactionStore.upsertReviewStatus({
          note: input.note ?? "Review requested for the current draft",
          ownerUserId: reviewerUserId.length > 0 ? reviewerUserId : null,
          releaseRecordId: input.releaseRecordId,
          stage: "review",
          state: "pending",
        })
        await transactionStore.updateReleaseRecordStage(input.releaseRecordId, "review")
        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: resources.currentDraft!.id,
          note: input.note ?? null,
          releaseRecordId: input.releaseRecordId,
          stage: "review",
          type: "review_requested",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },

    async approveDraft(input: DraftScopedCommandInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)

      if (resources.releaseSnapshot.releaseRecord.stage !== "review") {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "approve the draft")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)

      if (!resources.currentDraft) {
        throw new DraftRevisionNotFoundError(input.expectedDraftRevisionId)
      }

      const reviewSummary = buildReviewSummary(
        resources.currentDraft,
        resources.baseRecord.reviewStatusesByStage,
        resources.workflowEvents,
        new Map(),
      )

      if (reviewSummary.state !== "pending") {
        throw new ReviewRequestRequiredError()
      }

      if (!input.actorUserId || (reviewSummary.ownerUserId && reviewSummary.ownerUserId !== input.actorUserId)) {
        throw new ReviewerApprovalRequiredError()
      }

      await store.transaction(async (transactionStore) => {
        await transactionStore.upsertReviewStatus({
          note: input.note ?? "Draft approved and ready for publish pack export",
          ownerUserId: input.actorUserId,
          releaseRecordId: input.releaseRecordId,
          stage: "review",
          state: "approved",
        })
        await transactionStore.updateReleaseRecordStage(input.releaseRecordId, "publish_pack")
        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: resources.currentDraft!.id,
          note: input.note ?? null,
          releaseRecordId: input.releaseRecordId,
          stage: "review",
          type: "draft_approved",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },

    async reopenDraft(input: DraftScopedCommandInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)

      if (
        resources.releaseSnapshot.releaseRecord.stage !== "review" &&
        resources.releaseSnapshot.releaseRecord.stage !== "publish_pack"
      ) {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "reopen the draft")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)

      if (!resources.currentDraft) {
        throw new DraftRevisionNotFoundError(input.expectedDraftRevisionId)
      }

      await store.transaction(async (transactionStore) => {
        await transactionStore.upsertReviewStatus({
          note: input.note ?? "Draft reopened for edits",
          ownerUserId: input.actorUserId,
          releaseRecordId: input.releaseRecordId,
          stage: "review",
          state: "blocked",
        })
        await transactionStore.updateReleaseRecordStage(input.releaseRecordId, "draft")
        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: resources.currentDraft!.id,
          note: input.note ?? null,
          releaseRecordId: input.releaseRecordId,
          stage: resources.releaseSnapshot.releaseRecord.stage,
          type: "draft_reopened",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },

    async createPublishPack(input: DraftScopedCommandInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)

      if (resources.releaseSnapshot.releaseRecord.stage !== "publish_pack") {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "create a publish pack")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)

      if (!resources.currentDraft) {
        throw new DraftRevisionNotFoundError(input.expectedDraftRevisionId)
      }

      const users = await store.listUsersByIds(
        Array.from(
          new Set(
            [
              input.actorUserId,
              ...collectWorkflowUserIds([resources.releaseSnapshot], resources.workflowEvents),
            ].filter((userId): userId is string => userId !== null),
          ),
        ),
      )
      const userById = new Map(users.map((user) => [user.id, user]))
      const reviewSummary = buildReviewSummary(
        resources.currentDraft,
        resources.baseRecord.reviewStatusesByStage,
        resources.workflowEvents,
        userById,
      )
      const actor =
        input.actorUserId === null ? null : userById.get(input.actorUserId) ?? null

      if (reviewSummary.state !== "approved") {
        throw new ApprovedDraftRequiredError()
      }

      if (
        resources.baseRecord.latestPublishPackExport &&
        resources.baseRecord.latestPublishPackExport.draftRevisionId === resources.currentDraft.id
      ) {
        throw new InvalidStageTransitionError(
          resources.releaseSnapshot.releaseRecord.stage,
          "create another publish pack for the same draft",
        )
      }

      await store.transaction(async (transactionStore) => {
        await transactionStore.createPublishPackExport({
          changelogBody: resources.currentDraft!.changelogBody,
          contextSnapshot: buildPublishPackExportContextSnapshot({
            actor,
            actorUserId: input.actorUserId,
            reviewSummary,
          }),
          createdByUserId: input.actorUserId,
          draftRevisionId: resources.currentDraft!.id,
          evidenceSnapshots: resources.policy.includeEvidenceLinksInExport
            ? buildPublishPackExportEvidenceSnapshots(resources.releaseSnapshot)
            : [],
          policySnapshot: buildPublishPackExportPolicySnapshot(resources.policy),
          releaseNotesBody: resources.currentDraft!.releaseNotesBody,
          releaseRecordId: input.releaseRecordId,
          sourceSnapshots: resources.policy.includeSourceLinksInExport
            ? buildPublishPackExportSourceSnapshots(resources.releaseSnapshot)
            : [],
        })
        await transactionStore.upsertReviewStatus({
          note: input.note ?? "Publish pack exported from the approved draft",
          ownerUserId: input.actorUserId,
          releaseRecordId: input.releaseRecordId,
          stage: "publish_pack",
          state: "approved",
        })
        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: resources.currentDraft!.id,
          note: input.note ?? null,
          releaseRecordId: input.releaseRecordId,
          stage: "publish_pack",
          type: "publish_pack_created",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },
  }

  return service
}
