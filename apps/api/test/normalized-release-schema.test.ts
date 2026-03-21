import assert from "node:assert/strict"
import test from "node:test"

import { getTableColumns, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/pg-core"

import {
  claimCandidateEvidenceBlocks,
  claimCandidates,
  claimStatusEnum,
  currentWorkspaceSelections,
  draftClaimCheckResults,
  draftRevisions,
  evidenceBlocks,
  evidenceSourceTypeEnum,
  integrationConnections,
  publishPackExports,
  releaseRecords,
  reviewStateEnum,
  reviewStatuses,
  sourceCursors,
  sourceLinks,
  syncRuns,
  workflowEvents,
  workspaceMemberships,
} from "../src/db/schema.js"

test("normalized release schema exports the core release workflow tables", () => {
  assert.equal(getTableName(releaseRecords), "release_records")
  assert.equal(getTableName(evidenceBlocks), "evidence_blocks")
  assert.equal(getTableName(claimCandidates), "claim_candidates")
  assert.equal(getTableName(claimCandidateEvidenceBlocks), "claim_candidate_evidence_blocks")
  assert.equal(getTableName(sourceLinks), "source_links")
  assert.equal(getTableName(reviewStatuses), "review_statuses")
})

test("release records keep workspace, integration, and stage trace", () => {
  const columns = getTableColumns(releaseRecords)

  assert.ok(columns.id)
  assert.ok(columns.workspaceId)
  assert.ok(columns.connectionId)
  assert.ok(columns.title)
  assert.ok(columns.summary)
  assert.ok(columns.stage)
  assert.ok(columns.compareRange)
  assert.ok(columns.createdAt)
  assert.ok(columns.updatedAt)
})

test("claim candidates use explicit status values and join to evidence blocks", () => {
  assert.deepEqual(claimStatusEnum.enumValues, ["pending", "flagged", "approved", "rejected"])
  assert.deepEqual(evidenceSourceTypeEnum.enumValues, [
    "pull_request",
    "commit",
    "release",
    "ticket",
    "document",
  ])
  assert.deepEqual(reviewStateEnum.enumValues, ["pending", "blocked", "approved"])

  const joinColumns = getTableColumns(claimCandidateEvidenceBlocks)
  assert.ok(joinColumns.claimCandidateId)
  assert.ok(joinColumns.evidenceBlockId)
})

test("workspace and review workflow tables enforce idempotent uniqueness constraints", () => {
  const workspaceMembershipConfig = getTableConfig(workspaceMemberships)
  const sourceCursorConfig = getTableConfig(sourceCursors)
  const reviewStatusConfig = getTableConfig(reviewStatuses)
  const integrationConnectionConfig = getTableConfig(integrationConnections)
  const draftRevisionConfig = getTableConfig(draftRevisions)

  assert.ok(
    workspaceMembershipConfig.uniqueConstraints.some(
      (constraint) => constraint.getName() === "workspace_memberships_workspace_id_user_id_unique",
    ),
  )
  assert.ok(
    sourceCursorConfig.uniqueConstraints.some(
      (constraint) => constraint.getName() === "source_cursors_connection_id_key_unique",
    ),
  )
  assert.ok(
    reviewStatusConfig.uniqueConstraints.some(
      (constraint) => constraint.getName() === "review_statuses_release_record_id_stage_unique",
    ),
  )
  assert.ok(
    integrationConnectionConfig.uniqueConstraints.some(
      (constraint) => constraint.getName() === "integration_connections_id_workspace_id_unique",
    ),
  )
  assert.ok(
    draftRevisionConfig.uniqueConstraints.some(
      (constraint) => constraint.getName() === "draft_revisions_id_release_record_id_unique",
    ),
  )
})

test("sync and release records keep workspace and connection tenant boundaries aligned", () => {
  const syncRunConfig = getTableConfig(syncRuns)
  const releaseRecordConfig = getTableConfig(releaseRecords)
  const currentWorkspaceSelectionConfig = getTableConfig(currentWorkspaceSelections)
  const draftClaimCheckResultConfig = getTableConfig(draftClaimCheckResults)
  const workflowEventConfig = getTableConfig(workflowEvents)
  const publishPackExportConfig = getTableConfig(publishPackExports)

  assert.ok(
    syncRunConfig.foreignKeys.some(
      (constraint) =>
        constraint.getName() === "sync_runs_connection_id_workspace_id_integration_connections_fk",
    ),
  )
  assert.ok(
    releaseRecordConfig.foreignKeys.some(
      (constraint) =>
        constraint.getName() === "release_records_connection_id_workspace_id_integration_connections_fk",
    ),
  )
  assert.ok(
    currentWorkspaceSelectionConfig.foreignKeys.some(
      (constraint) =>
        constraint.getName() ===
        "current_workspace_selections_workspace_id_user_id_workspace_memberships_fk",
    ),
  )
  assert.ok(
    draftClaimCheckResultConfig.foreignKeys.some(
      (constraint) =>
        constraint.getName() ===
        "draft_claim_check_results_draft_revision_id_release_record_id_draft_revisions_fk",
    ),
  )
  assert.ok(
    workflowEventConfig.foreignKeys.some(
      (constraint) =>
        constraint.getName() === "workflow_events_draft_revision_id_release_record_id_draft_revisions_fk",
    ),
  )
  assert.ok(
    publishPackExportConfig.foreignKeys.some(
      (constraint) =>
        constraint.getName() === "publish_pack_exports_draft_revision_id_release_record_id_draft_revisions_fk",
    ),
  )
})
