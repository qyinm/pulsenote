"use client"

import type { FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  CalendarClockIcon,
  GitCompareArrowsIcon,
  GithubIcon,
  TagIcon,
} from "lucide-react"

import type { GitHubConnection, ReleaseRecordSnapshot } from "@/lib/api/client"
import { createApiClient } from "@/lib/api/client"
import { buildReleaseContextQueueItem } from "@/lib/dashboard/release-context"
import {
  BulletList,
  DashboardSplit,
  InlineList,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { SimpleTable } from "@/components/dashboard/simple-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type NewReleaseScopeMode = "compare" | "release" | "since_date"

type NewReleaseLiveWorkspaceProps = {
  initialGitHubConnection: GitHubConnection | null
  initialGitHubInstallUrl: string | null
  recentReleasesUnavailable?: boolean
  recentReleaseRecords: ReleaseRecordSnapshot[]
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

function getRecentReleaseRows(releaseRecords: ReleaseRecordSnapshot[]) {
  return releaseRecords.slice(0, 5).map((snapshot) => {
    const queueItem = buildReleaseContextQueueItem(snapshot)

    return {
      key: snapshot.releaseRecord.id,
      cells: {
        range: snapshot.releaseRecord.compareRange ?? "Release tag scope",
        readiness: queueItem.readiness,
        release: (
          <div className="grid gap-1">
            <span className="font-medium text-foreground">{queueItem.title}</span>
            <span className="text-xs text-muted-foreground">{queueItem.summary}</span>
          </div>
        ),
        stage: queueItem.stageLabel,
      },
    }
  })
}

function buildScopePreviewNotes({
  compareBase,
  compareHead,
  githubConnection,
  releaseTag,
  scopeMode,
  sinceDate,
}: {
  compareBase: string
  compareHead: string
  githubConnection: GitHubConnection
  releaseTag: string
  scopeMode: NewReleaseScopeMode
  sinceDate: string
}) {
  const repositoryLabel = `${githubConnection.repositoryOwner}/${githubConnection.repositoryName}`

  if (scopeMode === "release") {
    return [
      `Repository: ${repositoryLabel}`,
      releaseTag.trim()
        ? `PulseNote will sync the GitHub release tagged ${releaseTag.trim()} into one release record.`
        : "Choose the exact GitHub release tag that already exists before creating the record.",
      "The created release stays attached to its GitHub release evidence and source links from the start.",
    ]
  }

  if (scopeMode === "compare") {
    return [
      `Repository: ${repositoryLabel}`,
      compareBase.trim() && compareHead.trim()
        ? `PulseNote will compare ${compareBase.trim()}...${compareHead.trim()} and store one release scope from that diff.`
        : "Choose the base and head refs that define one reviewable release window.",
      "The compare scope will carry commit evidence and changed-file context into the release workflow.",
    ]
  }

  return [
    `Repository: ${repositoryLabel}`,
    sinceDate
      ? `Since date preview is planned for changes after ${sinceDate}, but it does not create a release record yet.`
      : "Since date preview is planned, but it does not create a release record yet.",
    "This mode will ship only once PulseNote can preview concrete commits and PRs before confirmation.",
  ]
}

export function NewReleaseLiveWorkspace({
  initialGitHubConnection,
  initialGitHubInstallUrl,
  recentReleasesUnavailable = false,
  recentReleaseRecords,
  workspaceId,
}: NewReleaseLiveWorkspaceProps) {
  const router = useRouter()
  const githubConnection = initialGitHubConnection
  const [scopeMode, setScopeMode] = useState<NewReleaseScopeMode>("compare")
  const [releaseTag, setReleaseTag] = useState("")
  const [compareBase, setCompareBase] = useState("main")
  const [compareHead, setCompareHead] = useState("")
  const [sinceDate, setSinceDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleReleaseSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!githubConnection) {
      setErrorMessage("Connect GitHub before creating a release scope.")
      return
    }

    if (!releaseTag.trim()) {
      setErrorMessage("Enter the GitHub release tag that should become this release record.")
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await createApiClient().syncGitHubRelease(workspaceId, {
        connectionId: githubConnection.connectionId,
        release: {
          tag: releaseTag.trim(),
        },
      })

      router.push(`/dashboard/releases?selected=${encodeURIComponent(result.releaseRecordId)}`)
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "GitHub release intake failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCompareSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!githubConnection) {
      setErrorMessage("Connect GitHub before creating a release scope.")
      return
    }

    if (!compareBase.trim() || !compareHead.trim()) {
      setErrorMessage("Both compare refs are required before creating the release record.")
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await createApiClient().syncGitHubCompare(workspaceId, {
        compare: {
          base: compareBase.trim(),
          head: compareHead.trim(),
        },
        connectionId: githubConnection.connectionId,
      })

      router.push(`/dashboard/releases?selected=${encodeURIComponent(result.releaseRecordId)}`)
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "GitHub compare intake failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardSplit
      main={
        <SurfaceCard
          title="New release"
          description="Choose one repository scope, confirm the release window, and let PulseNote create one record that carries draft, review, and publish-pack state all the way through."
        >
          {!githubConnection ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <p className="text-sm font-medium text-foreground">1. Connect the repository</p>
                <p className="text-sm text-muted-foreground">
                  PulseNote only creates release records from a connected GitHub repository so the full workflow stays attached to source evidence.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {initialGitHubInstallUrl ? (
                  <a href={initialGitHubInstallUrl} className={buttonVariants({ size: "sm" })}>
                    Connect GitHub
                  </a>
                ) : (
                  <p className="text-sm text-destructive">
                    GitHub App install is unavailable for this environment.
                  </p>
                )}
                <Link
                  href="/dashboard/settings"
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                >
                  Open settings
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium text-foreground">1. Repository</p>
                  <p className="text-sm text-muted-foreground">
                    One workspace currently routes release intake through one connected repository.
                  </p>
                </div>
                <InlineList
                  items={[
                    {
                      label: "Connected repo",
                      value: `${githubConnection.repositoryOwner}/${githubConnection.repositoryName}`,
                    },
                    {
                      label: "Status",
                      value: githubConnection.status === "active" ? "Active" : "Disconnected",
                    },
                    {
                      label: "Last sync",
                      value: formatLastSyncedAt(githubConnection.lastSyncedAt),
                    },
                  ]}
                />
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <GithubIcon data-icon="inline-start" />
                    GitHub App
                  </Badge>
                  <Link
                    href="/dashboard/settings"
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    Change repository
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-border/70 bg-background p-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium text-foreground">2. Scope</p>
                  <p className="text-sm text-muted-foreground">
                    Pick one concrete release scope. PulseNote will turn that scope into a single release record.
                  </p>
                </div>

                <Tabs
                  value={scopeMode}
                  onValueChange={(value) => setScopeMode(value as NewReleaseScopeMode)}
                  className="gap-4"
                >
                  <TabsList variant="line" className="w-full justify-start">
                    <TabsTrigger value="compare">
                      <GitCompareArrowsIcon data-icon="inline-start" />
                      Compare range
                    </TabsTrigger>
                    <TabsTrigger value="release">
                      <TagIcon data-icon="inline-start" />
                      Release tag
                    </TabsTrigger>
                    <TabsTrigger value="since_date">
                      <CalendarClockIcon data-icon="inline-start" />
                      Since date
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="compare">
                    <form className="grid gap-4" onSubmit={handleCompareSync}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="grid gap-2">
                          <label
                            htmlFor="new-release-compare-base"
                            className="text-sm font-medium text-foreground"
                          >
                            Base ref
                          </label>
                          <Input
                            id="new-release-compare-base"
                            value={compareBase}
                            onChange={(event) => setCompareBase(event.target.value)}
                            placeholder="main"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label
                            htmlFor="new-release-compare-head"
                            className="text-sm font-medium text-foreground"
                          >
                            Head ref
                          </label>
                          <Input
                            id="new-release-compare-head"
                            value={compareHead}
                            onChange={(event) => setCompareHead(event.target.value)}
                            placeholder="release/2026-03-30"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                          {isSubmitting ? "Creating release..." : "Create compare release"}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Use this when the team shipped work from one explicit range without publishing a formal GitHub release first.
                        </p>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="release">
                    <form className="grid gap-4" onSubmit={handleReleaseSync}>
                      <div className="grid gap-2">
                        <label
                          htmlFor="new-release-tag"
                          className="text-sm font-medium text-foreground"
                        >
                          Release tag
                        </label>
                        <Input
                          id="new-release-tag"
                          value={releaseTag}
                          onChange={(event) => setReleaseTag(event.target.value)}
                          placeholder="v2.4.0"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                          {isSubmitting ? "Creating release..." : "Create tagged release"}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Use this only when the GitHub release or tag already exists and should anchor the release record.
                        </p>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="since_date">
                    <div className="grid gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                      <div className="grid gap-2">
                        <label
                          htmlFor="new-release-since-date"
                          className="text-sm font-medium text-foreground"
                        >
                          Since date
                        </label>
                        <Input
                          id="new-release-since-date"
                          type="date"
                          value={sinceDate}
                          onChange={(event) => setSinceDate(event.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="button" size="sm" disabled>
                          Preview coming next
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          This mode will ship once PulseNote can preview concrete commits and PRs before confirming the release scope.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium text-foreground">3. What happens next</p>
                  <p className="text-sm text-muted-foreground">
                    PulseNote will create one release record and carry it into draft, claim check, approval, and publish-pack export.
                  </p>
                </div>
                <BulletList
                  items={buildScopePreviewNotes({
                    compareBase,
                    compareHead,
                    githubConnection,
                    releaseTag,
                    scopeMode,
                    sinceDate,
                  })}
                />
              </div>

              {errorMessage ? (
                <p className="text-sm text-destructive" role="alert">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          )}
        </SurfaceCard>
      }
      aside={
        <div className="grid gap-4">
          <SurfaceCard
            title="Release workflow"
            description="Every new release record follows the same operational path instead of splitting across separate tabs."
          >
            <BulletList
              items={[
                "1. Create one release scope from GitHub evidence.",
                "2. Turn that scope into one reviewable draft.",
                "3. Run claim check before public wording moves on.",
                "4. Route approval to one explicit reviewer handoff.",
                "5. Freeze one publish pack for final delivery.",
              ]}
            />
          </SurfaceCard>

          <SurfaceCard
            title="Recent releases"
            description="The newest release records stay one click away once you create the next one."
            action={
              <Link
                href="/dashboard/releases"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                Open releases
              </Link>
            }
          >
            {recentReleasesUnavailable ? (
              <p className="mb-3 text-sm text-muted-foreground">
                Recent releases could not be loaded right now, but the release scope builder is still available.
              </p>
            ) : null}
            <SimpleTable
              columns={[
                { key: "release", label: "Release" },
                { key: "stage", label: "Stage" },
                { key: "readiness", label: "Readiness" },
                { key: "range", label: "Scope" },
              ]}
              rows={getRecentReleaseRows(recentReleaseRecords)}
              emptyTitle="No releases yet"
              emptyDescription="Create the first release scope to start the workflow."
            />
          </SurfaceCard>
        </div>
      }
    />
  )
}
