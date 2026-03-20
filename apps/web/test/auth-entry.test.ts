import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { EmailAuthShell } from "../components/auth/email-auth-shell.js"
import { DashboardAccessState } from "../components/dashboard/dashboard-access-state.js"
import {
  getEmailAuthContent,
  submitEmailAuthForm,
} from "../lib/auth/email-auth.js"

test("sign-in page renders the release-scoped auth copy", async () => {
  const markup = renderToStaticMarkup(
    React.createElement(EmailAuthShell, {
      children: React.createElement("div", null, "Sign-in form"),
      mode: "sign-in",
    }),
  )

  assert.match(markup, /Sign in to PulseNote/i)
  assert.match(markup, /Open the release workspace/i)
  assert.match(markup, /href="\/auth\/sign-up"/i)
})

test("sign-up page renders the workspace bootstrap auth copy", async () => {
  const markup = renderToStaticMarkup(
    React.createElement(EmailAuthShell, {
      children: React.createElement("div", null, "Sign-up form"),
      mode: "sign-up",
    }),
  )

  assert.match(markup, /Create your PulseNote account/i)
  assert.match(markup, /Start a release workspace/i)
  assert.match(markup, /href="\/auth\/sign-in"/i)
})

test("DashboardAccessState shows auth CTAs for signed-out users", () => {
  const markup = renderToStaticMarkup(
    React.createElement(DashboardAccessState, { state: "signed-out" }),
  )

  assert.match(markup, /href="\/auth\/sign-in"/i)
  assert.match(markup, /href="\/auth\/sign-up"/i)
})

test("getEmailAuthContent returns release-specific sign-in copy", () => {
  assert.deepEqual(getEmailAuthContent("sign-in"), {
    alternateHref: "/auth/sign-up",
    alternateLabel: "Create an account",
    description:
      "Open the release workspace with an authenticated reviewer session before checking evidence, wording, and approvals.",
    primaryLabel: "Sign in",
    title: "Sign in to PulseNote",
  })
})

test("submitEmailAuthForm uses Better Auth sign-in email flow", async () => {
  const calls: Array<Record<string, unknown>> = []

  await submitEmailAuthForm(
    "sign-in",
    {
      callbackURL: "/dashboard/release-context",
      email: "owner@pulsenote.dev",
      password: "secret-passphrase",
    },
    {
      signIn: {
        async email(payload) {
          calls.push(payload)
          return { data: null, error: null }
        },
      },
      signUp: {
        async email() {
          throw new Error("signUp.email should not run for sign-in")
        },
      },
    },
  )

  assert.deepEqual(calls, [
    {
      callbackURL: "/dashboard/release-context",
      email: "owner@pulsenote.dev",
      password: "secret-passphrase",
    },
  ])
})

test("submitEmailAuthForm uses Better Auth sign-up email flow", async () => {
  const calls: Array<Record<string, unknown>> = []

  await submitEmailAuthForm(
    "sign-up",
    {
      callbackURL: "/dashboard/release-context",
      email: "owner@pulsenote.dev",
      name: "Owner User",
      password: "secret-passphrase",
    },
    {
      signIn: {
        async email() {
          throw new Error("signIn.email should not run for sign-up")
        },
      },
      signUp: {
        async email(payload) {
          calls.push(payload)
          return { data: null, error: null }
        },
      },
    },
  )

  assert.deepEqual(calls, [
    {
      callbackURL: "/dashboard/release-context",
      email: "owner@pulsenote.dev",
      name: "Owner User",
      password: "secret-passphrase",
    },
  ])
})
