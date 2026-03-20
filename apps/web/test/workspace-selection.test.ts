import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { DashboardAccessState } from "../components/dashboard/dashboard-access-state.js"
import { WorkspaceSelectionShell } from "../components/onboarding/workspace-selection-shell.js"
import { selectCurrentWorkspace } from "../lib/onboarding/workspace-selection.js"

test("WorkspaceSelectionShell explains why explicit current workspace selection matters", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkspaceSelectionShell, {
      children: React.createElement("div", null, "Selection form"),
    }),
  )

  assert.match(markup, /Choose the current PulseNote workspace/i)
  assert.match(markup, /release records, evidence links, and review state never mix across tenants/i)
})

test("DashboardAccessState sends multi-workspace users into the selection flow", () => {
  const markup = renderToStaticMarkup(
    React.createElement(DashboardAccessState, { state: "workspace-selection-required" }),
  )

  assert.match(markup, /href="\/select-workspace"/i)
})

test("selectCurrentWorkspace persists the chosen workspace through the API", async () => {
  const calls: Array<Record<string, unknown>> = []

  await selectCurrentWorkspace(
    {
      workspaceId: "workspace_2",
    },
    {
      setCurrentWorkspace(payload) {
        calls.push(payload)
        return Promise.resolve({
          integrationAccounts: [],
          integrations: [],
          memberships: [],
          sourceCursors: [],
          syncRuns: [],
          workspace: {
            createdAt: "2026-03-20T00:00:00.000Z",
            id: "workspace_2",
            name: "Second workspace",
            slug: "second-workspace",
            updatedAt: "2026-03-20T00:00:00.000Z",
          },
        })
      },
    },
  )

  assert.deepEqual(calls, [
    {
      workspaceId: "workspace_2",
    },
  ])
})
