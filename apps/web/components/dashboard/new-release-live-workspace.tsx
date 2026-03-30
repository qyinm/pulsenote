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

import type {
  GitHubConnection,
  GitHubScopePreview,
  ReleaseRecordSnapshot,
} from "@/lib/api/client"
import { createApiClient } from "@/lib/api/client"
import { buildReleaseContextQueueItem } from "@/lib/dashboard/release-context"
import {
  getReleaseDraftTemplateOption,
  releaseDraftTemplateOptions,
} from "@/lib/draft-templates"
import { buildReleaseWorkspaceHref } from "@/lib/release-workflow"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

function formatPreviewTimestamp(value: string | null) {
  if (!value) {
    return "Unknown time"
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

function buildPreviewCommitRows(preview: GitHubScopePreview) {
  return preview.commits.slice(0, 5).map((commit) => ({
    key: commit.sha,
    cells: {
      committedAt: formatPreviewTimestamp(commit.committedAt),
      message: (
        <div className="grid gap-1">
          <span className="font-medium text-foreground">{commit.message.split("\n")[0]}</span>
          <span className="text-xs text-muted-foreground">{commit.sha.slice(0, 7)}</span>
        </div>
      ),
    },
  }))
}

function buildPreviewFileRows(preview: GitHubScopePreview) {
  return preview.files.slice(0, 5).map((file) => ({
    key: file.filename,
    cells: {
      file: file.filename,
      status: file.status,
      changes: `${file.changes} lines`,
    },
  }))
}

function buildPreviewDetails(preview: GitHubScopePreview) {
  const items = [
    {
      label: "Scope",
      value: preview.scopeLabel,
    },
    {
      label: "Expected evidence",
      value: String(preview.expectedEvidenceBlockCount),
    },
    {
      label: "Expected source links",
      value: String(preview.expectedSourceLinkCount),
    },
  ]

  if (preview.compareRange) {
    items.splice(1, 0, {
      label: "Resolved range",
      value: preview.compareRange,
    })
  }

  if (preview.mode === "since_date" && preview.defaultBranch) {
    items.splice(1, 0, {
      label: "Default branch",
      value: preview.defaultBranch,
    })
  }

  if (preview.release) {
    items.push(
      {
        label: "Release tag",
        value: preview.release.tagName,
      },
      {
        label: "Assets",
        value: String(preview.release.assets.length),
      },
    )
  } else {
    items.push({
      label: "Commits",
      value: String(preview.totalCommits),
    })
  }

  return items
}

function canConfirmPreview(preview: GitHubScopePreview | null) {
  if (!preview) {
    return false
  }

  if (preview.mode === "release") {
    return preview.release !== null
  }

  return preview.resolvedCompare !== null && preview.totalCommits > 0
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
  const [draftTemplateId, setDraftTemplateId] = useState<string>(
    releaseDraftTemplateOptions[0]?.id ?? "release_note_packet",
  )
  const [preview, setPreview] = useState<GitHubScopePreview | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function resetPreview() {
    setPreview(null)
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!githubConnection) {
      setErrorMessage("Connect GitHub before previewing a release scope.")
      return
    }

    setErrorMessage(null)
    setIsPreviewing(true)

    try {
      const apiClient = createApiClient()
      const nextPreview =
        scopeMode === "release"
          ? await apiClient.previewGitHubRelease(workspaceId, {
              connectionId: githubConnection.connectionId,
              release: {
                tag: releaseTag.trim(),
              },
            })
          : scopeMode === "since_date"
            ? await apiClient.previewGitHubSinceDate(workspaceId, {
                connectionId: githubConnection.connectionId,
                sinceDate: sinceDate.trim(),
              })
            : await apiClient.previewGitHubCompare(workspaceId, {
                compare: {
                  base: compareBase.trim(),
                  head: compareHead.trim(),
                },
                connectionId: githubConnection.connectionId,
              })

      setPreview(nextPreview)
    } catch (error) {
      setPreview(null)
      setErrorMessage(error instanceof Error ? error.message : "Release scope preview failed.")
    } finally {
      setIsPreviewing(false)
    }
  }

  async function handleConfirmPreview() {
    if (!githubConnection || !preview) {
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const apiClient = createApiClient()
      const result =
        preview.mode === "release" && preview.release
          ? await apiClient.syncGitHubRelease(workspaceId, {
              connectionId: githubConnection.connectionId,
              draftTemplateId,
              release: {
                tag: preview.release.tagName,
              },
            })
          : await apiClient.syncGitHubCompare(workspaceId, {
              compare: {
                base: preview.resolvedCompare!.base,
                head: preview.resolvedCompare!.head,
              },
              connectionId: githubConnection.connectionId,
              draftTemplateId,
            })

      router.push(
        buildReleaseWorkspaceHref({
          selectedId: result.releaseRecordId,
        }),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Release creation failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const previewCommitRows = preview ? buildPreviewCommitRows(preview) : []
  const previewFileRows = preview ? buildPreviewFileRows(preview) : []
  const selectedDraftTemplate = getReleaseDraftTemplateOption(draftTemplateId)

  return (
    <DashboardSplit
      main={
        <SurfaceCard
          title="New release"
          description="Choose one repository scope, preview the exact evidence PulseNote will ingest, and confirm one release record before draft, review, and publish-pack work begins."
        >
          {!githubConnection ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <p className="text-sm font-medium text-foreground">1. Connect the repository</p>
                <p className="text-sm text-muted-foreground">
                  PulseNote only creates release records from a connected GitHub repository so the workflow stays attached to source evidence from the start.
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
                    Pick one concrete release scope, preview the exact release evidence, then confirm the release record.
                  </p>
                </div>

                <Tabs
                  value={scopeMode}
                  onValueChange={(value) => {
                    setScopeMode(value as NewReleaseScopeMode)
                    resetPreview()
                    setErrorMessage(null)
                  }}
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
                    <form className="grid gap-4" onSubmit={handlePreview}>
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
                            onChange={(event) => {
                              setCompareBase(event.target.value)
                              resetPreview()
                            }}
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
                            onChange={(event) => {
                              setCompareHead(event.target.value)
                              resetPreview()
                            }}
                            placeholder="release/2026-03-30"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" size="sm" disabled={isPreviewing || isSubmitting}>
                          {isPreviewing ? "Previewing scope..." : "Preview compare scope"}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Use this when the team shipped work from one explicit range without publishing a formal GitHub release first.
                        </p>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="release">
                    <form className="grid gap-4" onSubmit={handlePreview}>
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
                          onChange={(event) => {
                            setReleaseTag(event.target.value)
                            resetPreview()
                          }}
                          placeholder="v2.4.0"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" size="sm" disabled={isPreviewing || isSubmitting}>
                          {isPreviewing ? "Previewing scope..." : "Preview release tag"}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Use this only when the GitHub release or tag already exists and should anchor the release record.
                        </p>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="since_date">
                    <form className="grid gap-4" onSubmit={handlePreview}>
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
                          onChange={(event) => {
                            setSinceDate(event.target.value)
                            resetPreview()
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" size="sm" disabled={isPreviewing || isSubmitting}>
                          {isPreviewing ? "Previewing scope..." : "Preview since date"}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          PulseNote will resolve the date into one explicit compare range before it creates the release record.
                        </p>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid gap-4 rounded-2xl border border-border/70 bg-background p-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium text-foreground">3. Draft template</p>
                  <p className="text-sm text-muted-foreground">
                    Choose the release output once during release creation. The release detail page only shows this setting afterward.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid gap-2">
                    <label htmlFor="new-release-template" className="text-sm font-medium text-foreground">
                      Output template
                    </label>
                    <Select
                      value={draftTemplateId}
                      onValueChange={(value) => {
                        if (value) {
                          setDraftTemplateId(value)
                        }
                      }}
                    >
                      <SelectTrigger id="new-release-template">
                        <SelectValue placeholder="Choose a draft template" />
                      </SelectTrigger>
                      <SelectContent>
                        {releaseDraftTemplateOptions.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{selectedDraftTemplate.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedDraftTemplate.fields.length} field
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedDraftTemplate.description}</p>
                    <BulletList items={selectedDraftTemplate.fields.map((field) => field.label)} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="grid gap-1">
                  <p className="text-sm font-medium text-foreground">4. Preview</p>
                  <p className="text-sm text-muted-foreground">
                    Confirm the exact release evidence before PulseNote creates one release record.
                  </p>
                </div>

                {preview ? (
                  <div className="grid gap-4">
                    <InlineList items={buildPreviewDetails(preview)} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <SurfaceCard title={preview.title} description={preview.summary}>
                        <BulletList items={preview.previewNotes} />
                      </SurfaceCard>
                      {preview.release ? (
                        <SurfaceCard
                          title="Release evidence"
                          description="Tagged release metadata and assets that will anchor this record."
                        >
                          <InlineList
                            items={[
                              {
                                label: "Published",
                                value: formatPreviewTimestamp(preview.release.publishedAt),
                              },
                              {
                                label: "Target",
                                value: preview.release.targetCommitish,
                              },
                              {
                                label: "Assets",
                                value: String(preview.release.assets.length),
                              },
                            ]}
                          />
                        </SurfaceCard>
                      ) : (
                        <SurfaceCard
                          title="Scope coverage"
                          description="These commits and changed files become the intake evidence for this release."
                        >
                          <InlineList
                            items={[
                              {
                                label: "Commits",
                                value: String(preview.totalCommits),
                              },
                              {
                                label: "Changed files",
                                value: String(preview.changedFileCount),
                              },
                              {
                                label: "Claim candidates",
                                value: String(preview.expectedClaimCandidateCount),
                              },
                            ]}
                          />
                        </SurfaceCard>
                      )}
                    </div>

                    {preview.commits.length > 0 ? (
                      <SimpleTable
                        columns={[
                          { key: "message", label: "Commit" },
                          { key: "committedAt", label: "Committed" },
                        ]}
                        rows={previewCommitRows}
                        emptyTitle="No commits in preview"
                        emptyDescription="Choose another scope before creating the release record."
                      />
                    ) : null}

                    {preview.files.length > 0 ? (
                      <SimpleTable
                        columns={[
                          { key: "file", label: "Changed file" },
                          { key: "status", label: "Status" },
                          { key: "changes", label: "Changes" },
                        ]}
                        rows={previewFileRows}
                        emptyTitle="No files in preview"
                        emptyDescription="Choose another scope before creating the release record."
                      />
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSubmitting || !canConfirmPreview(preview)}
                        onClick={() => {
                          void handleConfirmPreview()
                        }}
                      >
                        {isSubmitting ? "Creating release..." : "Create release record"}
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        {canConfirmPreview(preview)
                          ? "PulseNote will create one release record from this confirmed scope."
                          : "This scope does not have enough confirmed evidence to create a release record yet."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <BulletList
                    items={[
                      "1. Pick a concrete GitHub scope.",
                      "2. Preview the exact commits, release metadata, and source coverage.",
                      "3. Confirm the scope only after the evidence looks right.",
                    ]}
                  />
                )}
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
                "1. Confirm one release scope from GitHub evidence.",
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
