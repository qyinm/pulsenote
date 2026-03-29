"use client"

import { useMemo, useState } from "react"

import type { WorkspacePolicySettings } from "@/lib/api/client"
import { createApiClient } from "@/lib/api/client"
import { SurfaceCard } from "@/components/dashboard/surfaces"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type WorkspacePolicySettingsCardProps = {
  initialSettings: WorkspacePolicySettings
  workspaceId: string
}

type EditableWorkspacePolicySettings = Pick<
  WorkspacePolicySettings,
  | "includeEvidenceLinksInExport"
  | "includeSourceLinksInExport"
  | "requireClaimCheckBeforeApproval"
  | "requireReviewerAssignment"
  | "showBlockedClaimsInInbox"
  | "showPendingApprovalsInInbox"
  | "showReopenedDraftsInInbox"
>

type PolicyToggleDefinition = {
  description: string
  key: keyof EditableWorkspacePolicySettings
  label: string
}

const reviewPolicyToggles: PolicyToggleDefinition[] = [
  {
    description: "Keep approval gated by an explicit claim check pass before any reviewer handoff begins.",
    key: "requireClaimCheckBeforeApproval",
    label: "Require claim check before approval",
  },
  {
    description: "Keep one named reviewer attached to every approval handoff instead of leaving sign-off responsibility implicit.",
    key: "requireReviewerAssignment",
    label: "Require reviewer assignment",
  },
]

const notificationPolicyToggles: PolicyToggleDefinition[] = [
  {
    description: "Keep blocked claim-check items visible in the inbox until the wording or evidence gap is narrowed.",
    key: "showBlockedClaimsInInbox",
    label: "Show blocked claim checks in inbox",
  },
  {
    description: "Keep pending approvals visible in the inbox while a reviewer still owns the sign-off decision.",
    key: "showPendingApprovalsInInbox",
    label: "Show pending approvals in inbox",
  },
  {
    description: "Keep reopened drafts visible in the inbox so wording regressions do not disappear between review passes.",
    key: "showReopenedDraftsInInbox",
    label: "Show reopened drafts in inbox",
  },
]

const exportPolicyToggles: PolicyToggleDefinition[] = [
  {
    description: "Carry evidence links into export handoff so public wording can still trace back to source proof.",
    key: "includeEvidenceLinksInExport",
    label: "Include evidence links in export handoff",
  },
  {
    description: "Keep source links attached to export handoff so the publish pack does not lose repository context.",
    key: "includeSourceLinksInExport",
    label: "Include source links in export handoff",
  },
]

function formatSavedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })
}

function getEditableSettings(settings: WorkspacePolicySettings): EditableWorkspacePolicySettings {
  return {
    includeEvidenceLinksInExport: settings.includeEvidenceLinksInExport,
    includeSourceLinksInExport: settings.includeSourceLinksInExport,
    requireClaimCheckBeforeApproval: settings.requireClaimCheckBeforeApproval,
    requireReviewerAssignment: settings.requireReviewerAssignment,
    showBlockedClaimsInInbox: settings.showBlockedClaimsInInbox,
    showPendingApprovalsInInbox: settings.showPendingApprovalsInInbox,
    showReopenedDraftsInInbox: settings.showReopenedDraftsInInbox,
  }
}

function PolicyToggleGroup({
  onCheckedChange,
  settings,
  title,
  toggles,
}: {
  onCheckedChange: (key: keyof EditableWorkspacePolicySettings, nextValue: boolean) => void
  settings: EditableWorkspacePolicySettings
  title: string
  toggles: PolicyToggleDefinition[]
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="grid gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      {toggles.map((toggle) => (
        <div
          key={toggle.key}
          className="flex items-start justify-between gap-4 border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
        >
          <div className="grid gap-1">
            <Label htmlFor={toggle.key} className="text-sm font-medium text-foreground">
              {toggle.label}
            </Label>
            <p className="text-sm text-muted-foreground">{toggle.description}</p>
          </div>
          <Switch
            id={toggle.key}
            checked={settings[toggle.key]}
            onCheckedChange={(checked) => onCheckedChange(toggle.key, checked)}
          />
        </div>
      ))}
    </div>
  )
}

export function WorkspacePolicySettingsCard({
  initialSettings,
  workspaceId,
}: WorkspacePolicySettingsCardProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [draftSettings, setDraftSettings] = useState<EditableWorkspacePolicySettings>(() =>
    getEditableSettings(initialSettings),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const hasChanges = useMemo(() => {
    const persistedSettings = getEditableSettings(settings)

    return Object.entries(draftSettings).some(
      ([key, value]) => persistedSettings[key as keyof EditableWorkspacePolicySettings] !== value,
    )
  }, [draftSettings, settings])

  function updateDraftSetting(key: keyof EditableWorkspacePolicySettings, nextValue: boolean) {
    setDraftSettings((currentSettings) => ({
      ...currentSettings,
      [key]: nextValue,
    }))
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    setNotice(null)

    try {
      const nextSettings = await createApiClient().updateWorkspacePolicySettings(workspaceId, draftSettings)
      setSettings(nextSettings)
      setDraftSettings(getEditableSettings(nextSettings))
      setNotice("Workspace workflow policy was saved.")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Workspace workflow policy could not be saved.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    setDraftSettings(getEditableSettings(settings))
    setError(null)
    setNotice(null)
  }

  return (
    <SurfaceCard
      title="Workspace workflow policy"
      description="These saved defaults keep review routing, inbox visibility, and export handoff consistent across the release workspace."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Last saved {formatSavedAt(settings.updatedAt)} UTC
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save policy"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <PolicyToggleGroup
          title="Review policy defaults"
          settings={draftSettings}
          toggles={reviewPolicyToggles}
          onCheckedChange={updateDraftSetting}
        />
        <PolicyToggleGroup
          title="Inbox signal defaults"
          settings={draftSettings}
          toggles={notificationPolicyToggles}
          onCheckedChange={updateDraftSetting}
        />
        <PolicyToggleGroup
          title="Export handoff defaults"
          settings={draftSettings}
          toggles={exportPolicyToggles}
          onCheckedChange={updateDraftSetting}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </div>
    </SurfaceCard>
  )
}
