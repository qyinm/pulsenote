import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { renderReleaseWorkflowAccessFallback } from "../components/dashboard/release-workflow-page.js"

test("renderReleaseWorkflowAccessFallback renders sign-in actions for signed-out users", () => {
  const markup = renderToStaticMarkup(renderReleaseWorkflowAccessFallback("signed-out"))

  assert.match(markup, /Sign in to open the dashboard/i)
  assert.match(markup, /href="\/auth\/sign-in"/i)
  assert.match(markup, /href="\/auth\/sign-up"/i)
})

test("renderReleaseWorkflowAccessFallback renders workspace onboarding actions", () => {
  const markup = renderToStaticMarkup(renderReleaseWorkflowAccessFallback("no-workspace"))

  assert.match(markup, /No workspace membership found/i)
  assert.match(markup, /href="\/onboarding"/i)
})

test("renderReleaseWorkflowAccessFallback renders workspace selection actions", () => {
  const markup = renderToStaticMarkup(
    renderReleaseWorkflowAccessFallback("workspace-selection-required"),
  )

  assert.match(markup, /Select a workspace before opening the dashboard/i)
  assert.match(markup, /href="\/select-workspace"/i)
})
