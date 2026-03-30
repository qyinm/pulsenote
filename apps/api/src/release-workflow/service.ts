import type {
  ClaimCandidate,
  DraftClaimCheckResult,
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
} from "./draft-templates.js"
import type {
  ApprovalSummary,
  ClaimCheckSummary,
  CreateDraftInput,
  DraftScopedCommandInput,
  PublishPackSummary,
  ReleaseWorkflowBaseRecord,
  ReleaseWorkflowDetail,
  ReleaseWorkflowHistoryEntry,
  ReleaseWorkflowListItem,
  RequestApprovalInput,
  WorkflowAllowedAction,
  WorkflowReadiness,
} from "./models.js"
import type { ReleaseWorkflowStore } from "./store.js"

type DraftComposerResult = {
  changelogBody: string
  releaseNotesBody: string
}

type ClaimCheckCandidate = {
  evidenceBlockIds: string[]
  note: string | null
  sentence: string
  status: DraftClaimCheckResult["status"]
}

type ReleaseWorkflowServiceDependencies = {
  composeDraft?: (releaseSnapshot: ReleaseRecordSnapshot) => Promise<DraftComposerResult>
  runClaimCheck?: (
    releaseSnapshot: ReleaseRecordSnapshot,
    draftRevision: DraftRevision,
  ) => Promise<ClaimCheckCandidate[]>
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

export class ClaimCheckRequiredError extends Error {
  constructor() {
    super("Run claim check before requesting approval")
    this.name = "ClaimCheckRequiredError"
  }
}

export class ClaimCheckBlockedError extends Error {
  constructor() {
    super("Resolve flagged claim checks before requesting approval")
    this.name = "ClaimCheckBlockedError"
  }
}

export class ApprovalRequestRequiredError extends Error {
  constructor() {
    super("Approval must be requested before this draft can be approved")
    this.name = "ApprovalRequestRequiredError"
  }
}

export class ReviewerAssignmentRequiredError extends Error {
  constructor() {
    super("Select a workspace reviewer before requesting approval")
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

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function isHeadingLine(value: string) {
  const trimmed = value.trim()

  return (
    trimmed.length === 0 ||
    trimmed.startsWith("#") ||
    trimmed.endsWith(":") ||
    trimmed === "What changed" ||
    trimmed === "Included changes"
  )
}

function splitDraftSentences(text: string) {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/[.!?]\s+/))
    .map((line) => line.replace(/^[*-]\s*/, "").trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isHeadingLine(line))
}

function getDraftSentences(draftRevision: DraftRevision) {
  const sentences = [...splitDraftSentences(draftRevision.releaseNotesBody), ...splitDraftSentences(draftRevision.changelogBody)]
  const seen = new Set<string>()

  return sentences.filter((sentence) => {
    const normalizedSentence = normalizeText(sentence)

    if (normalizedSentence.length === 0 || seen.has(normalizedSentence)) {
      return false
    }

    seen.add(normalizedSentence)
    return true
  })
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

function buildClaimSupportIndex(releaseSnapshot: ReleaseRecordSnapshot) {
  const supportIndex = new Map<string, string[]>()
  const defaultEvidenceIds = releaseSnapshot.evidenceBlocks.map((evidenceBlock) => evidenceBlock.id)

  for (const claimCandidate of releaseSnapshot.claimCandidates) {
    supportIndex.set(normalizeText(claimCandidate.sentence), claimCandidate.evidenceBlockIds)
  }

  for (const evidenceBlock of releaseSnapshot.evidenceBlocks) {
    supportIndex.set(normalizeText(evidenceBlock.title), [evidenceBlock.id])
  }

  if (releaseSnapshot.releaseRecord.summary) {
    supportIndex.set(normalizeText(releaseSnapshot.releaseRecord.summary), defaultEvidenceIds)
  }

  supportIndex.set(normalizeText(releaseSnapshot.releaseRecord.title), defaultEvidenceIds)

  return supportIndex
}

function shouldFlagSentence(sentence: string) {
  return /\b(faster|instant|seamless|best|reliable|improved|fully|automatic|automatically|secure)\b/i.test(
    sentence,
  )
}

async function runClaimCheckAgainstReleaseSnapshot(
  releaseSnapshot: ReleaseRecordSnapshot,
  draftRevision: DraftRevision,
) {
  const supportIndex = buildClaimSupportIndex(releaseSnapshot)

  return getDraftSentences(draftRevision).map((sentence) => {
    const normalizedSentence = normalizeText(sentence)
    const matchingEvidenceBlockIds = supportIndex.get(normalizedSentence) ?? []

    if (matchingEvidenceBlockIds.length > 0) {
      return {
        evidenceBlockIds: matchingEvidenceBlockIds,
        note: null,
        sentence,
        status: "approved",
      } satisfies ClaimCheckCandidate
    }

    return {
      evidenceBlockIds: [],
      note: shouldFlagSentence(sentence)
        ? "This sentence sounds customer-facing but could not be traced to release evidence."
        : "Add evidence or rewrite this sentence before review.",
      sentence,
      status: "flagged",
    } satisfies ClaimCheckCandidate
  })
}

function getReviewStatusMap(reviewStatuses: ReviewStatus[]) {
  return Object.fromEntries(reviewStatuses.map((reviewStatus) => [reviewStatus.stage, reviewStatus])) as Partial<
    Record<ReviewStatus["stage"], ReviewStatus>
  >
}

function getLatestApprovalEventForDraft(workflowEvents: WorkflowEvent[], draftRevisionId: string | null) {
  if (!draftRevisionId) {
    return null
  }

  const approvalEventTypes = new Set(["approval_requested", "draft_approved", "draft_reopened"])
  const getApprovalEventPriority = (workflowEvent: WorkflowEvent) => {
    switch (workflowEvent.type) {
      case "approval_requested":
        return 1
      case "draft_approved":
        return 2
      case "draft_reopened":
        return 3
      default:
        return 0
    }
  }

  return [...workflowEvents]
    .filter(
      (workflowEvent) =>
        workflowEvent.draftRevisionId === draftRevisionId && approvalEventTypes.has(workflowEvent.type),
    )
    .sort((left, right) => {
      const createdAtComparison = right.createdAt.localeCompare(left.createdAt)

      if (createdAtComparison !== 0) {
        return createdAtComparison
      }

      return getApprovalEventPriority(right) - getApprovalEventPriority(left)
    })[0] ?? null
}

function getLatestApprovalRequestEventForDraft(
  workflowEvents: WorkflowEvent[],
  draftRevisionId: string | null,
) {
  if (!draftRevisionId) {
    return null
  }

  let latestApprovalRequestEvent: WorkflowEvent | null = null

  for (const workflowEvent of workflowEvents) {
    if (workflowEvent.draftRevisionId !== draftRevisionId || workflowEvent.type !== "approval_requested") {
      continue
    }

    if (
      !latestApprovalRequestEvent ||
      workflowEvent.createdAt > latestApprovalRequestEvent.createdAt ||
      workflowEvent.createdAt === latestApprovalRequestEvent.createdAt
    ) {
      latestApprovalRequestEvent = workflowEvent
    }
  }

  return latestApprovalRequestEvent
}

function buildClaimCheckSummary(
  currentDraft: Pick<DraftRevision, "id"> | null,
  claimCheckResults: DraftClaimCheckResult[],
): ClaimCheckSummary {
  const currentDraftResults =
    currentDraft === null
      ? []
      : claimCheckResults.filter((claimCheckResult) => claimCheckResult.draftRevisionId === currentDraft.id)
  const flaggedClaims = currentDraftResults.filter((claimCheckResult) => claimCheckResult.status === "flagged").length

  if (!currentDraft || currentDraftResults.length === 0) {
    return {
      blockerNotes: [],
      draftRevisionId: currentDraft?.id ?? null,
      flaggedClaims: 0,
      items: [],
      state: "not_started",
      totalClaims: 0,
    }
  }

  return {
    blockerNotes: currentDraftResults
      .filter((claimCheckResult) => claimCheckResult.status === "flagged" && claimCheckResult.note)
      .map((claimCheckResult) => claimCheckResult.note!)
      .filter((note, index, collection) => collection.indexOf(note) === index),
    draftRevisionId: currentDraft.id,
    flaggedClaims,
    items: currentDraftResults,
    state: flaggedClaims > 0 ? "blocked" : "cleared",
    totalClaims: currentDraftResults.length,
  }
}

function buildApprovalSummary(
  currentDraft: Pick<DraftRevision, "id"> | null,
  reviewStatusesByStage: Partial<Record<ReviewStatus["stage"], ReviewStatus>>,
  workflowEvents: WorkflowEvent[],
  userById: Map<string, User>,
): ApprovalSummary {
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

  const latestApprovalEvent = getLatestApprovalEventForDraft(workflowEvents, currentDraft.id)
  const latestApprovalRequestEvent = getLatestApprovalRequestEventForDraft(workflowEvents, currentDraft.id)
  const approvalReviewStatus = reviewStatusesByStage.approval ?? null
  const ownerId = approvalReviewStatus?.ownerUserId
  const owner = ownerId ? userById.get(ownerId) ?? null : null
  const requesterId = latestApprovalRequestEvent?.actorUserId
  const requestedBy = requesterId ? userById.get(requesterId) ?? null : null

  if (!latestApprovalEvent) {
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

  if (latestApprovalEvent.type === "draft_reopened") {
    return {
      draftRevisionId: currentDraft.id,
      note: latestApprovalEvent.note,
      ownerName: buildHistoryActorName(owner),
      ownerUserId: approvalReviewStatus?.ownerUserId ?? null,
      requestedByName: buildHistoryActorName(requestedBy),
      requestedByUserId: latestApprovalRequestEvent?.actorUserId ?? null,
      state: "reopened",
      updatedAt: latestApprovalEvent.createdAt,
    }
  }

  if (latestApprovalEvent.type === "draft_approved") {
    return {
      draftRevisionId: currentDraft.id,
      note: approvalReviewStatus?.note ?? latestApprovalEvent.note,
      ownerName: buildHistoryActorName(owner),
      ownerUserId: approvalReviewStatus?.ownerUserId ?? null,
      requestedByName: buildHistoryActorName(requestedBy),
      requestedByUserId: latestApprovalRequestEvent?.actorUserId ?? null,
      state: "approved",
      updatedAt: approvalReviewStatus?.updatedAt ?? latestApprovalEvent.createdAt,
    }
  }

  return {
    draftRevisionId: currentDraft.id,
    note: approvalReviewStatus?.note ?? latestApprovalEvent.note,
    ownerName: buildHistoryActorName(owner),
    ownerUserId: approvalReviewStatus?.ownerUserId ?? null,
    requestedByName: buildHistoryActorName(requestedBy),
    requestedByUserId: latestApprovalRequestEvent?.actorUserId ?? null,
    state: "pending",
    updatedAt: approvalReviewStatus?.updatedAt ?? latestApprovalEvent.createdAt,
  }
}

function buildPublishPackSummary(
  currentDraft: Pick<DraftRevision, "id"> | null,
  latestPublishPackExport: ReleaseWorkflowBaseRecord["latestPublishPackExport"],
  approvalSummary: ApprovalSummary,
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

  if (approvalSummary.state === "approved") {
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
  approvalSummary: ApprovalSummary
  claimCheckSummary: ClaimCheckSummary
  currentDraft: Pick<DraftRevision, "id"> | null
  policy: Pick<WorkspacePolicySettings, "requireClaimCheckBeforeApproval">
  publishPackSummary: PublishPackSummary
  stage: ReleaseRecordSnapshot["releaseRecord"]["stage"]
}): WorkflowAllowedAction[] {
  const allowedActions: WorkflowAllowedAction[] = []

  if (input.stage === "intake" || input.stage === "draft") {
    allowedActions.push("create_draft")
  }

  if (input.stage === "draft" && input.currentDraft) {
    allowedActions.push("run_claim_check")
  }

  if (canRequestApproval(input)) {
    allowedActions.push("request_approval")
  }

  if (
    (input.stage === "claim_check" || input.stage === "approval" || input.stage === "publish_pack") &&
    input.currentDraft
  ) {
    allowedActions.push("reopen_draft")
  }

  if (input.stage === "approval" && input.currentDraft && input.approvalSummary.state === "pending") {
    allowedActions.push("approve_draft")
  }

  if (
    input.stage === "publish_pack" &&
    input.currentDraft &&
    input.approvalSummary.state === "approved" &&
    input.publishPackSummary.state !== "exported"
  ) {
    allowedActions.push("create_publish_pack")
  }

  return allowedActions
}

function canRequestApproval(input: {
  claimCheckSummary: ClaimCheckSummary
  currentDraft: Pick<DraftRevision, "id"> | null
  policy: Pick<WorkspacePolicySettings, "requireClaimCheckBeforeApproval">
  stage: ReleaseRecordSnapshot["releaseRecord"]["stage"]
}) {
  if (!input.currentDraft) {
    return false
  }

  if (input.policy.requireClaimCheckBeforeApproval === false) {
    if (input.stage === "draft") {
      return input.claimCheckSummary.state !== "blocked"
    }

    return input.stage === "claim_check" && input.claimCheckSummary.state !== "blocked"
  }

  return input.stage === "claim_check" && input.claimCheckSummary.state === "cleared"
}

function buildReadiness(input: {
  allowedActions: WorkflowAllowedAction[]
  claimCheckSummary: ClaimCheckSummary
  publishPackSummary: PublishPackSummary
}): WorkflowReadiness {
  if (input.claimCheckSummary.state === "blocked") {
    return "blocked"
  }

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
  policy: WorkspacePolicySettings,
  workflowEvents: WorkflowEvent[],
  userById: Map<string, User>,
): ReleaseWorkflowDetail {
  const claimCheckSummary = buildClaimCheckSummary(
    baseRecord.currentDraft,
    [],
  )
  const approvalSummary = buildApprovalSummary(
    baseRecord.currentDraft,
    baseRecord.reviewStatusesByStage,
    workflowEvents,
    userById,
  )
  const publishPackSummary = buildPublishPackSummary(
    baseRecord.currentDraft,
    baseRecord.latestPublishPackExport,
    approvalSummary,
  )
  const publishPackArtifact = buildPublishPackArtifact(baseRecord.latestPublishPackExport)
  const allowedActions = buildAllowedActions({
    approvalSummary,
    claimCheckSummary,
    currentDraft: baseRecord.currentDraft,
    policy,
    publishPackSummary,
    stage: baseRecord.releaseSnapshot.releaseRecord.stage,
  })
  const readiness = buildReadiness({
    allowedActions,
    claimCheckSummary,
    publishPackSummary,
  })

  return {
    allowedActions,
    approvalSummary,
    claimCheckSummary,
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
    sourceLinks: baseRecord.releaseSnapshot.sourceLinks,
  }
}

function withClaimCheckItems(
  detail: ReleaseWorkflowDetail,
  claimCheckResults: DraftClaimCheckResult[],
  policy: WorkspacePolicySettings,
): ReleaseWorkflowDetail {
  const claimCheckSummary = buildClaimCheckSummary(detail.currentDraft, claimCheckResults)
  const allowedActions = buildAllowedActions({
    approvalSummary: detail.approvalSummary,
    claimCheckSummary,
    currentDraft: detail.currentDraft,
    policy,
    publishPackSummary: detail.latestPublishPackSummary,
    stage: detail.releaseRecord.stage,
  })

  return {
    ...detail,
    allowedActions,
    claimCheckSummary,
    readiness: buildReadiness({
      allowedActions,
      claimCheckSummary,
      publishPackSummary: detail.latestPublishPackSummary,
    }),
  }
}

function detailToListItem(detail: ReleaseWorkflowDetail): ReleaseWorkflowListItem {
  return {
    allowedActions: detail.allowedActions,
    approvalSummary: detail.approvalSummary,
    claimCheckSummary: {
      blockerNotes: detail.claimCheckSummary.blockerNotes,
      draftRevisionId: detail.claimCheckSummary.draftRevisionId,
      flaggedClaims: detail.claimCheckSummary.flaggedClaims,
      state: detail.claimCheckSummary.state,
      totalClaims: detail.claimCheckSummary.totalClaims,
    },
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
      stage: detail.releaseRecord.stage,
      summary: detail.releaseRecord.summary,
      title: detail.releaseRecord.title,
      updatedAt: detail.releaseRecord.updatedAt,
      workspaceId: detail.releaseRecord.workspaceId,
    },
    sourceLinkCount: detail.sourceLinks.length,
  }
}

function buildHistoryEventLabel(workflowEvent: WorkflowEvent): string {
  switch (workflowEvent.type) {
    case "draft_created":
      return "Draft created"
    case "claim_check_completed":
      return "Claim check completed"
    case "approval_requested":
      return "Approval requested"
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
  claimCheckSummaryByDraftRevisionId: Map<string, ClaimCheckSummary>,
): ReleaseWorkflowHistoryEntry["outcome"] {
  switch (workflowEvent.type) {
    case "draft_created":
      return "revision"
    case "claim_check_completed": {
      if (!workflowEvent.draftRevisionId) {
        return "progressed"
      }

      const claimCheckSummary = claimCheckSummaryByDraftRevisionId.get(workflowEvent.draftRevisionId)
      return claimCheckSummary?.state === "blocked" ? "blocked" : "progressed"
    }
    case "approval_requested":
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
  approvalSummary: ApprovalSummary
}) {
  return {
    approvalNote: input.approvalSummary.note,
    approvalOwnerName: input.approvalSummary.ownerName,
    approvalOwnerUserId: input.approvalSummary.ownerUserId,
    approvalRequestedByName: input.approvalSummary.requestedByName,
    approvalRequestedByUserId: input.approvalSummary.requestedByUserId,
    approvalState: input.approvalSummary.state,
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

function buildClaimCheckSummaryByDraftRevisionId(
  draftRevisions: DraftRevision[],
  claimCheckResults: DraftClaimCheckResult[],
) {
  const claimCheckResultsByDraftRevisionId = new Map<string, DraftClaimCheckResult[]>()

  for (const claimCheckResult of claimCheckResults) {
    const items = claimCheckResultsByDraftRevisionId.get(claimCheckResult.draftRevisionId) ?? []
    items.push(claimCheckResult)
    claimCheckResultsByDraftRevisionId.set(claimCheckResult.draftRevisionId, items)
  }

  return new Map(
    draftRevisions.map((draftRevision) => [
      draftRevision.id,
      buildClaimCheckSummary(draftRevision, claimCheckResultsByDraftRevisionId.get(draftRevision.id) ?? []),
    ]),
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
      case "claim_check_completed":
        return 2
      case "approval_requested":
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
  const runClaimCheck = dependencies.runClaimCheck ?? runClaimCheckAgainstReleaseSnapshot

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
    const claimCheckResults =
      currentDraft === null
        ? []
        : await workflowStore.listDraftClaimCheckResultsByDraftRevisionIds([currentDraft.id])
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
      claimCheckResults,
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
    const [claimCheckResults, users] = await Promise.all([
      draftRevisionIds.length > 0
        ? workflowStore.listDraftClaimCheckResultsByDraftRevisionIds(draftRevisionIds)
        : Promise.resolve([]),
      workflowStore.listUsersByIds(
        Array.from(
          new Set(
            workflowEvents
              .map((workflowEvent) => workflowEvent.actorUserId)
              .filter((actorUserId): actorUserId is string => actorUserId !== null),
          ),
        ),
      ),
    ])

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
    const claimCheckSummaryByDraftRevisionId = buildClaimCheckSummaryByDraftRevisionId(
      draftRevisions,
      claimCheckResults,
    )

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
          outcome: buildHistoryEventOutcome(workflowEvent, claimCheckSummaryByDraftRevisionId),
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

      const currentDraftIds = latestDrafts.map((draftRevision) => draftRevision.id)
      const claimCheckResults =
        currentDraftIds.length > 0
          ? await store.listDraftClaimCheckResultsByDraftRevisionIds(currentDraftIds)
          : []
      const claimCheckResultsByDraftRevisionId = new Map<string, DraftClaimCheckResult[]>()

      for (const claimCheckResult of claimCheckResults) {
        const draftClaimCheckResults =
          claimCheckResultsByDraftRevisionId.get(claimCheckResult.draftRevisionId) ?? []
        draftClaimCheckResults.push(claimCheckResult)
        claimCheckResultsByDraftRevisionId.set(claimCheckResult.draftRevisionId, draftClaimCheckResults)
      }

      return releaseSnapshots.map((releaseSnapshot) => {
        const currentDraft = latestDraftByReleaseRecordId.get(releaseSnapshot.releaseRecord.id) ?? null
        const detail = buildWorkflowDetailFromBaseRecord(
          buildBaseRecord({
            currentDraft,
            latestPublishPackExport:
              latestPublishPackByReleaseRecordId.get(releaseSnapshot.releaseRecord.id) ?? null,
            releaseSnapshot,
          }),
          policy,
          workflowEventsByReleaseRecordId.get(releaseSnapshot.releaseRecord.id) ?? [],
          userById,
        )

        return detailToListItem(
          withClaimCheckItems(
            detail,
            currentDraft ? claimCheckResultsByDraftRevisionId.get(currentDraft.id) ?? [] : [],
            policy,
          ),
        )
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
      const detail = buildWorkflowDetailFromBaseRecord(
        resources.baseRecord,
        resources.policy,
        resources.workflowEvents,
        new Map(users.map((user) => [user.id, user])),
      )

      return withClaimCheckItems(detail, resources.claimCheckResults, resources.policy)
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

      const requestedTemplateId = input.templateId?.trim() ?? ""

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
      const evidenceRefs = createDraftEvidenceRefs(resources.releaseSnapshot, fieldSnapshots)

      await store.transaction(async (transactionStore) => {
        const draftRevision = await transactionStore.createDraftRevision({
          changelogBody: draftContent.changelogBody,
          createdByUserId: input.actorUserId,
          evidenceRefs,
          fieldSnapshots,
          releaseNotesBody: draftContent.releaseNotesBody,
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

    async runClaimCheck(input: DraftScopedCommandInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)

      if (resources.releaseSnapshot.releaseRecord.stage !== "draft") {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "run claim check")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)

      if (!resources.currentDraft) {
        throw new DraftRevisionNotFoundError(input.expectedDraftRevisionId)
      }

      const claimCheckCandidates = await runClaimCheck(resources.releaseSnapshot, resources.currentDraft)
      const hasFlaggedClaims = claimCheckCandidates.some((claimCheckCandidate) => claimCheckCandidate.status === "flagged")

      await store.transaction(async (transactionStore) => {
        await transactionStore.deleteDraftClaimCheckResultsByDraftRevisionId(resources.currentDraft!.id)

        for (const claimCheckCandidate of claimCheckCandidates) {
          const claimCheckResult = await transactionStore.createDraftClaimCheckResult({
            draftRevisionId: resources.currentDraft!.id,
            note: claimCheckCandidate.note,
            releaseRecordId: input.releaseRecordId,
            sentence: claimCheckCandidate.sentence,
            status: claimCheckCandidate.status,
          })

          for (const evidenceBlockId of claimCheckCandidate.evidenceBlockIds) {
            await transactionStore.linkDraftClaimCheckResultEvidenceBlock({
              draftClaimCheckResultId: claimCheckResult.id,
              evidenceBlockId,
            })
          }
        }

        await transactionStore.upsertReviewStatus({
          note: hasFlaggedClaims
            ? "Resolve flagged claims before requesting approval"
            : "Claim check is clear for this draft",
          ownerUserId: input.actorUserId,
          releaseRecordId: input.releaseRecordId,
          stage: "claim_check",
          state: hasFlaggedClaims ? "blocked" : "approved",
        })
        await transactionStore.updateReleaseRecordStage(input.releaseRecordId, "claim_check")
        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: resources.currentDraft!.id,
          note: input.note ?? null,
          releaseRecordId: input.releaseRecordId,
          stage: "claim_check",
          type: "claim_check_completed",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },

    async requestApproval(input: RequestApprovalInput): Promise<ReleaseWorkflowDetail> {
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

      if (resources.policy.requireClaimCheckBeforeApproval && resources.releaseSnapshot.releaseRecord.stage === "draft") {
        assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)

        if (resources.currentDraft) {
          throw new ClaimCheckRequiredError()
        }
      }

      const isClaimCheckStage = resources.releaseSnapshot.releaseRecord.stage === "claim_check"
      const isDraftStageWithOptionalClaimCheck =
        resources.releaseSnapshot.releaseRecord.stage === "draft" &&
        resources.policy.requireClaimCheckBeforeApproval === false

      if (!isClaimCheckStage && !isDraftStageWithOptionalClaimCheck) {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "request approval")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)

      if (!resources.currentDraft) {
        throw new DraftRevisionNotFoundError(input.expectedDraftRevisionId)
      }

      const claimCheckSummary = buildClaimCheckSummary(resources.currentDraft, resources.claimCheckResults)

      if (resources.policy.requireClaimCheckBeforeApproval && claimCheckSummary.state === "not_started") {
        throw new ClaimCheckRequiredError()
      }

      if (claimCheckSummary.state === "blocked") {
        throw new ClaimCheckBlockedError()
      }

      await store.transaction(async (transactionStore) => {
        await transactionStore.upsertReviewStatus({
          note: input.note ?? "Approval requested for the current draft",
          ownerUserId: reviewerUserId.length > 0 ? reviewerUserId : null,
          releaseRecordId: input.releaseRecordId,
          stage: "approval",
          state: "pending",
        })
        await transactionStore.updateReleaseRecordStage(input.releaseRecordId, "approval")
        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: resources.currentDraft!.id,
          note: input.note ?? null,
          releaseRecordId: input.releaseRecordId,
          stage: "approval",
          type: "approval_requested",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },

    async approveDraft(input: DraftScopedCommandInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)

      if (resources.releaseSnapshot.releaseRecord.stage !== "approval") {
        throw new InvalidStageTransitionError(resources.releaseSnapshot.releaseRecord.stage, "approve the draft")
      }

      assertExpectedDraftRevision(resources.currentDraft, input.expectedDraftRevisionId)

      if (!resources.currentDraft) {
        throw new DraftRevisionNotFoundError(input.expectedDraftRevisionId)
      }

      const approvalSummary = buildApprovalSummary(
        resources.currentDraft,
        resources.baseRecord.reviewStatusesByStage,
        resources.workflowEvents,
        new Map(),
      )

      if (approvalSummary.state !== "pending") {
        throw new ApprovalRequestRequiredError()
      }

      if (!input.actorUserId || (approvalSummary.ownerUserId && approvalSummary.ownerUserId !== input.actorUserId)) {
        throw new ReviewerApprovalRequiredError()
      }

      await store.transaction(async (transactionStore) => {
        await transactionStore.upsertReviewStatus({
          note: input.note ?? "Draft approved and ready for publish pack export",
          ownerUserId: input.actorUserId,
          releaseRecordId: input.releaseRecordId,
          stage: "approval",
          state: "approved",
        })
        await transactionStore.updateReleaseRecordStage(input.releaseRecordId, "publish_pack")
        await transactionStore.createWorkflowEvent({
          actorUserId: input.actorUserId,
          draftRevisionId: resources.currentDraft!.id,
          note: input.note ?? null,
          releaseRecordId: input.releaseRecordId,
          stage: "approval",
          type: "draft_approved",
        })
      })

      return service.getReleaseWorkflowDetail(input.workspaceId, input.releaseRecordId)
    },

    async reopenDraft(input: DraftScopedCommandInput): Promise<ReleaseWorkflowDetail> {
      const resources = await getWorkflowResources(store, input.workspaceId, input.releaseRecordId)

      if (
        resources.releaseSnapshot.releaseRecord.stage !== "claim_check" &&
        resources.releaseSnapshot.releaseRecord.stage !== "approval" &&
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
          stage: "approval",
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
      const approvalSummary = buildApprovalSummary(
        resources.currentDraft,
        resources.baseRecord.reviewStatusesByStage,
        resources.workflowEvents,
        userById,
      )
      const actor =
        input.actorUserId === null ? null : userById.get(input.actorUserId) ?? null

      if (approvalSummary.state !== "approved") {
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
            approvalSummary,
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
