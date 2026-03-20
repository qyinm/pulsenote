import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { DashboardAccessState } from "../components/dashboard/dashboard-access-state.js"
import { WorkspaceSelectionEmptyState } from "../components/onboarding/workspace-selection-empty-state.js"
import { WorkspaceSelectionShell } from "../components/onboarding/workspace-selection-shell.js"
import {
  resolveWorkspaceSelectionState,
  selectCurrentWorkspace,
} from "../lib/onboarding/workspace-selection.js"

test("WorkspaceSelectionShell explains why explicit current workspace selection matters", () => {
  const markup = renderToStaticMarkup(
    React.createElement(
      WorkspaceSelectionShell,
      null,
      React.createElement("div", null, "Selection form"),
    ),
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

test("selectCurrentWorkspace rejects blank workspace selections before calling the API", async () => {
  let called = false

  await assert.rejects(
    () =>
      selectCurrentWorkspace(
        {
          workspaceId: "   ",
        },
        {
          setCurrentWorkspace() {
            called = true
            return Promise.reject(new Error("setCurrentWorkspace should not run"))
          },
        },
      ),
    /Choose a workspace before continuing\./,
  )

  assert.equal(called, false)
})

test("resolveWorkspaceSelectionState preserves the saved current workspace selection", () => {
  const state = resolveWorkspaceSelectionState(
    [
      {
        membership: { role: "owner" },
        workspace: { id: "workspace_1", name: "Alpha", slug: "alpha" },
      },
      {
        membership: { role: "editor" },
        workspace: { id: "workspace_2", name: "Bravo", slug: "bravo" },
      },
    ],
    "workspace_2",
  )

  assert.deepEqual(state, {
    kind: "ready",
    selectedWorkspaceId: "workspace_2",
  })
})

test("resolveWorkspaceSelectionState falls back to the first choice when no saved selection exists", () => {
  const state = resolveWorkspaceSelectionState([
    {
      membership: { role: "owner" },
      workspace: { id: "workspace_1", name: "Alpha", slug: "alpha" },
    },
    {
      membership: { role: "editor" },
      workspace: { id: "workspace_2", name: "Bravo", slug: "bravo" },
    },
  ])

  assert.deepEqual(state, {
    kind: "ready",
    selectedWorkspaceId: "workspace_1",
  })
})

test("resolveWorkspaceSelectionState returns an empty state when no choices are available", () => {
  assert.deepEqual(resolveWorkspaceSelectionState([]), {
    kind: "empty",
  })
})

test("WorkspaceSelectionEmptyState sends users back to onboarding", () => {
  const markup = renderToStaticMarkup(React.createElement(WorkspaceSelectionEmptyState))

  assert.match(markup, /No workspace memberships are available yet/i)
  assert.match(markup, /href="\/onboarding"/i)
})
