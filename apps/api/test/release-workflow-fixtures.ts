import type { AuthService, AuthSession } from "../src/auth/service.js"
import { createFoundationService } from "../src/foundation/service.js"
import { createInMemoryFoundationStore } from "../src/foundation/store.js"
import { createInMemoryReleaseWorkflowStore } from "../src/release-workflow/in-memory-store.js"
import { createReleaseWorkflowService } from "../src/release-workflow/service.js"

export const runtimeEnv = {
  appName: "pulsenote-api-test",
  appVersion: "test",
  autoRunMigrations: false,
  betterAuthCookieDomain: null,
  betterAuthSecret: null,
  betterAuthUrl: null,
  databaseUrl: null,
  host: "127.0.0.1",
  nodeEnv: "test" as const,
  port: 9999,
  trustedOrigins: [],
}

export function createAuthService(session: AuthSession): AuthService {
  return {
    async getSession() {
      return session
    },
    async handler() {
      return Response.json({ ok: true })
    },
    isConfigured: true,
  }
}

export function createAuthenticatedSession(userId: string): AuthSession {
  return {
    session: {
      createdAt: "2026-03-20T00:00:00.000Z",
      expiresAt: "2026-03-27T00:00:00.000Z",
      id: `session_${userId}`,
      token: `token_${userId}`,
      updatedAt: "2026-03-20T00:00:00.000Z",
      userId,
    },
    user: {
      createdAt: "2026-03-20T00:00:00.000Z",
      email: `${userId}@pulsenote.dev`,
      emailVerified: false,
      id: userId,
      image: null,
      name: `User ${userId}`,
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
  }
}

type SeedReleaseWorkflowFixtureDependencies = Parameters<typeof createReleaseWorkflowService>[1]

export async function seedReleaseWorkflowFixture(
  dependencies: SeedReleaseWorkflowFixtureDependencies = {},
) {
  const foundationStore = createInMemoryFoundationStore()
  const foundationService = createFoundationService(foundationStore)
  const bootstrap = await foundationService.bootstrapWorkspace({
    user: {
      email: "owner@pulsenote.dev",
      fullName: "Owner User",
    },
    workspace: {
      name: "PulseNote",
      slug: "pulsenote",
    },
  })
  const connection = await foundationService.createIntegrationConnection({
    externalAccountId: "github-installation-1200",
    provider: "github",
    workspaceId: bootstrap.workspace.id,
  })
  const releaseRecord = await foundationStore.createReleaseRecord({
    compareRange: "main...HEAD",
    connectionId: connection.id,
    stage: "intake",
    summary: "Adds release workflow commands and review checkpoints.",
    title: "Release founder workflow",
    workspaceId: bootstrap.workspace.id,
  })
  const evidenceBlock = await foundationStore.createEvidenceBlock({
    body: "Adds explicit draft, claim check, approval, and publish pack steps.",
    evidenceState: "fresh",
    provider: "github",
    releaseRecordId: releaseRecord.id,
    sourceRef: "pull/123",
    sourceType: "pull_request",
    title: "Introduce founder release workflow",
  })
  const claimCandidate = await foundationStore.createClaimCandidate({
    releaseRecordId: releaseRecord.id,
    sentence: "Adds founder release workflow and approval checkpoints",
    status: "pending",
  })

  await foundationStore.linkClaimCandidateEvidenceBlock({
    claimCandidateId: claimCandidate.id,
    evidenceBlockId: evidenceBlock.id,
  })
  await foundationStore.createSourceLink({
    label: "Pull request #123",
    provider: "github",
    releaseRecordId: releaseRecord.id,
    url: "https://github.com/qyinm/pulsenote/pull/123",
  })
  await foundationStore.createReviewStatus({
    note: "Queued from GitHub intake",
    ownerUserId: null,
    releaseRecordId: releaseRecord.id,
    stage: "intake",
    state: "pending",
  })

  const workflowStore = createInMemoryReleaseWorkflowStore(foundationStore)
  const workflowService = createReleaseWorkflowService(workflowStore, dependencies)

  return {
    bootstrap,
    connection,
    evidenceBlock,
    foundationService,
    foundationStore,
    releaseRecord,
    workflowService,
    workflowStore,
  }
}
