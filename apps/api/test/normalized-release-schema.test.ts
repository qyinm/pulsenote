import assert from "node:assert/strict"
import test from "node:test"

import { getTableColumns, getTableName } from "drizzle-orm"

import {
  claimCandidateEvidenceBlocks,
  claimCandidates,
  claimStatusEnum,
  evidenceBlocks,
  evidenceSourceTypeEnum,
  releaseRecords,
  reviewStateEnum,
  reviewStatuses,
  sourceLinks,
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
