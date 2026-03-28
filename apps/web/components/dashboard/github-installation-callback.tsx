"use client"

import { useEffect, useState } from "react"

import type { GitHubInstallationRepository } from "@/lib/api/client"
import { createApiClient } from "@/lib/api/client"
import { SurfaceCard } from "@/components/dashboard/surfaces"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type GitHubInstallationCallbackProps = {
  installationId: string | null
  state: string | null
  workspaceId: string
}

export function GitHubInstallationCallback({
  installationId,
  state,
  workspaceId,
}: GitHubInstallationCallbackProps) {
  const [repositories, setRepositories] = useState<GitHubInstallationRepository[]>([])
  const [selectedRepository, setSelectedRepository] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(installationId))
  const missingInstallationError =
    installationId && state ? null : "GitHub did not return a valid installation handoff."
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!installationId || !state) {
      return
    }

    let isCancelled = false

    createApiClient()
      .listGitHubInstallationRepositories(workspaceId, installationId, state)
      .then((items) => {
        if (isCancelled) {
          return
        }

        setRepositories(items)
        setSelectedRepository(items[0]?.fullName ?? "")
      })
      .catch((loadError: unknown) => {
        if (isCancelled) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "GitHub installation repositories could not be loaded.",
        )
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [installationId, state, workspaceId])

  async function handleConnect() {
    if (!installationId || !state) {
      setError("GitHub installation is missing.")
      return
    }

    const repository = repositories.find((item) => item.fullName === selectedRepository)

    if (!repository) {
      setError("Select a repository before saving the GitHub connection.")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await createApiClient().connectGitHubRepository(workspaceId, {
        installationId,
        state,
        repository: {
          name: repository.name,
          owner: repository.owner,
          url: repository.url,
        },
      })

      window.location.assign("/dashboard/release-context")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "GitHub connection could not be saved.")
      setIsSaving(false)
    }
  }

  return (
    <SurfaceCard
      title="Finish GitHub connection"
      description="Choose the repository that should feed release intake for this PulseNote workspace."
    >
      <div className="grid gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading repositories from the GitHub installation.</p>
        ) : (
          <>
            <Select value={selectedRepository} onValueChange={(value) => setSelectedRepository(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a repository" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {repositories.map((repository) => (
                    <SelectItem key={repository.id} value={repository.fullName}>
                      {repository.fullName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isSaving || repositories.length === 0}
                className={buttonVariants({ size: "sm" })}
                onClick={handleConnect}
              >
                {isSaving ? "Saving..." : "Save GitHub connection"}
              </button>
              <a
                href="/dashboard/release-context"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Back to release context
              </a>
            </div>
          </>
        )}

        {missingInstallationError ? (
          <p className="text-sm text-destructive">{missingInstallationError}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </SurfaceCard>
  )
}
