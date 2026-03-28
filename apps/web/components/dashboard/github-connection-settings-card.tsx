"use client"

import { useState } from "react"
import { GithubIcon, Link2Icon } from "lucide-react"

import type { GitHubConnection } from "@/lib/api/client"
import { createApiClient } from "@/lib/api/client"
import { InlineList, SurfaceCard } from "@/components/dashboard/surfaces"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

type GitHubConnectionSettingsCardProps = {
  initialGitHubConnection: GitHubConnection | null
  initialGitHubInstallUrl: string | null
  workspaceId: string
}

function formatLastSyncedAt(value: string | null) {
  if (!value) {
    return "Not synced yet"
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function GitHubConnectionSettingsCard({
  initialGitHubConnection,
  initialGitHubInstallUrl,
  workspaceId,
}: GitHubConnectionSettingsCardProps) {
  const [githubConnection, setGitHubConnection] = useState(initialGitHubConnection)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  async function handleDisconnect() {
    setIsDisconnecting(true)
    setError(null)
    setNotice(null)

    try {
      await createApiClient().disconnectGitHubConnection(workspaceId)
      setGitHubConnection(null)
      setNotice(
        "GitHub connection was removed. Release intake will stay idle until another repository is connected.",
      )
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "GitHub connection could not be disconnected.",
      )
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <SurfaceCard
      title="GitHub intake connection"
      description="Settings keep repository ownership explicit, but the primary intake flow still starts in release context."
      action={<Badge variant="outline">One repo per workspace</Badge>}
    >
      <div className="grid gap-4">
        {githubConnection ? (
          <>
            <InlineList
              items={[
                {
                  label: "Repository",
                  value: `${githubConnection.repositoryOwner}/${githubConnection.repositoryName}`,
                },
                {
                  label: "Last sync",
                  value: formatLastSyncedAt(githubConnection.lastSyncedAt),
                },
                {
                  label: "Connection",
                  value: githubConnection.status === "active" ? "Active" : "Disconnected",
                },
              ]}
            />

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/dashboard/release-context"
                className={buttonVariants({ size: "sm" })}
              >
                Open release intake
              </a>
              {initialGitHubInstallUrl ? (
                <a
                  href={initialGitHubInstallUrl}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Reconnect GitHub
                </a>
              ) : null}
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className={buttonVariants({ size: "sm", variant: "destructive" })}
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </>
        ) : (
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="grid gap-1">
              <p className="text-sm text-foreground">
                No GitHub repository is connected to this workspace.
              </p>
              <p className="text-sm text-muted-foreground">
                Connect one repository so release intake can keep evidence, claims, and approval history attached to a single source of truth.
              </p>
            </div>
            {initialGitHubInstallUrl ? (
              <a
                href={initialGitHubInstallUrl}
                className={buttonVariants({ size: "sm" })}
              >
                Connect GitHub
              </a>
            ) : (
              <p className="text-sm text-destructive">GitHub App install is unavailable for this environment.</p>
            )}
          </div>
        )}

        {githubConnection?.repositoryUrl ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <GithubIcon className="size-4" />
            <a
              href={githubConnection.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
            >
              <Link2Icon className="size-3.5" />
              {githubConnection.repositoryUrl}
            </a>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </div>
    </SurfaceCard>
  )
}
