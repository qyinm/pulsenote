import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { DashboardAccessState } from "../components/dashboard/dashboard-access-state.js"
import { WorkspaceOnboardingShell } from "../components/onboarding/workspace-onboarding-shell.js"
import {
  normalizeWorkspaceSlug,
  submitWorkspaceOnboardingForm,
} from "../lib/onboarding/workspace.js"

test("WorkspaceOnboardingShell renders release-scoped onboarding copy", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkspaceOnboardingShell, {
      children: React.createElement("div", null, "Onboarding form"),
    }),
  )

  assert.match(markup, /Create your first PulseNote workspace/i)
  assert.match(markup, /keep release context, claim checks, approvals, and publish pack/i)
})

test("DashboardAccessState sends no-workspace users into onboarding", () => {
  const markup = renderToStaticMarkup(
    React.createElement(DashboardAccessState, { state: "no-workspace" }),
  )

  assert.match(markup, /href="\/onboarding"/i)
})

test("normalizeWorkspaceSlug creates a stable workspace slug from the workspace name", () => {
  assert.equal(normalizeWorkspaceSlug("  Release Ops Team  "), "release-ops-team")
  assert.equal(normalizeWorkspaceSlug("!!"), "workspace")
})

test("submitWorkspaceOnboardingForm bootstraps the current authenticated user", async () => {
  const calls: Array<Record<string, unknown>> = []

  await submitWorkspaceOnboardingForm(
    {
      name: "Release Ops Team",
    },
    {
      bootstrapCurrentUserWorkspace(payload) {
        calls.push(payload)
        return Promise.resolve({
          integrationAccounts: [],
          integrations: [],
          memberships: [],
          sourceCursors: [],
          syncRuns: [],
          workspace: {
            createdAt: "2026-03-20T00:00:00.000Z",
            id: "workspace_1",
            name: "Release Ops Team",
            slug: "release-ops-team",
            updatedAt: "2026-03-20T00:00:00.000Z",
          },
        })
      },
    },
  )

  assert.deepEqual(calls, [
    {
      workspace: {
        name: "Release Ops Team",
        slug: "release-ops-team",
      },
    },
  ])
})
