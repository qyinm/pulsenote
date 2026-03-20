"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizeWorkspaceSlug, submitWorkspaceOnboardingForm } from "@/lib/onboarding/workspace"

import { WorkspaceOnboardingShell } from "./workspace-onboarding-shell"

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Workspace setup failed. Check the input and try again."
}

export function WorkspaceOnboardingCard() {
  const router = useRouter()
  const [workspaceName, setWorkspaceName] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const workspaceSlug = normalizeWorkspaceSlug(workspaceName)

  return (
    <WorkspaceOnboardingShell>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setErrorMessage(null)

          startTransition(async () => {
            try {
              await submitWorkspaceOnboardingForm({
                name: workspaceName,
              })

              router.push("/dashboard/release-context")
              router.refresh()
            } catch (error) {
              setErrorMessage(getErrorMessage(error))
            }
          })
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            name="workspaceName"
            placeholder="Release Operations"
            required
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Workspace slug: {workspaceSlug}</p>
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Creating workspace..." : "Create workspace"}
        </Button>
      </form>
    </WorkspaceOnboardingShell>
  )
}
