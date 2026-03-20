"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import type { WorkspaceChoice } from "@/lib/api/client"
import { selectCurrentWorkspace } from "@/lib/onboarding/workspace-selection"

import { WorkspaceSelectionShell } from "./workspace-selection-shell"

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Workspace selection failed. Choose a workspace and try again."
}

type WorkspaceSelectionCardProps = {
  choices: WorkspaceChoice[]
}

export function WorkspaceSelectionCard({ choices }: WorkspaceSelectionCardProps) {
  const router = useRouter()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(choices[0]?.workspace.id ?? "")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <WorkspaceSelectionShell>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          setErrorMessage(null)

          startTransition(async () => {
            try {
              await selectCurrentWorkspace({
                workspaceId: selectedWorkspaceId,
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
          {choices.map((choice) => (
            <label
              key={choice.workspace.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm"
            >
              <input
                checked={selectedWorkspaceId === choice.workspace.id}
                className="mt-1"
                name="workspaceId"
                onChange={() => setSelectedWorkspaceId(choice.workspace.id)}
                type="radio"
                value={choice.workspace.id}
              />
              <span className="grid gap-1">
                <span className="font-medium text-foreground">{choice.workspace.name}</span>
                <span className="text-muted-foreground">
                  {choice.workspace.slug} · {choice.membership.role}
                </span>
              </span>
            </label>
          ))}
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={!selectedWorkspaceId || isPending}>
          {isPending ? "Opening workspace..." : "Open release workspace"}
        </Button>
      </form>
    </WorkspaceSelectionShell>
  )
}
