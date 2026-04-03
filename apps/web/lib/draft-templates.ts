import type { ReleaseWorkflowDraftFieldSnapshot, ReleaseWorkflowDetail } from "./api/client"

export type ReleaseDraftTemplateOption = {
  description: string
  fields: Array<{
    key: string
    label: string
  }>
  id: string
  label: string
  primaryBodyFieldKey: string
}

export const releaseDraftTemplateOptions = [
  {
    description: "Compose one reviewable publish-pack draft for the selected release.",
    fields: [
      { key: "publish_pack", label: "Publish pack" },
    ],
    id: "release_note_packet",
    label: "Release notes packet",
    primaryBodyFieldKey: "publish_pack",
  },
  {
    description: "Write one customer-facing update for the shipped release.",
    fields: [
      { key: "customer_update", label: "Customer update" },
    ],
    id: "customer_update",
    label: "Customer update",
    primaryBodyFieldKey: "customer_update",
  },
  {
    description: "Draft one help-center style update for the shipped release.",
    fields: [
      { key: "help_center_update", label: "Help center update" },
    ],
    id: "help_center_update",
    label: "Help center update",
    primaryBodyFieldKey: "help_center_update",
  },
] as const satisfies ReleaseDraftTemplateOption[]

export function getReleaseDraftTemplateOption(templateId: string | null | undefined) {
  return (
    releaseDraftTemplateOptions.find((template) => template.id === templateId) ??
    releaseDraftTemplateOptions[0]
  )
}

export function getReleaseDraftPrimaryBodyFieldKey(templateId: string | null | undefined) {
  return getReleaseDraftTemplateOption(templateId).primaryBodyFieldKey
}

function joinTemplateSections(sections: Array<string | null | undefined>) {
  return sections
    .map((section) => section?.trim() ?? "")
    .filter((section) => section.length > 0)
    .join("\n\n")
}

function buildDraftDisplayContent(draft: NonNullable<ReleaseWorkflowDetail["currentDraft"]>) {
  switch (draft.templateId) {
    case "release_note_packet": {
      const trimmedReleaseNotesBody = draft.releaseNotesBody.trim()
      const trimmedChangelogBody = draft.changelogBody.trim()

      if (trimmedReleaseNotesBody.length === 0) {
        return trimmedChangelogBody
      }

      if (trimmedChangelogBody.length === 0 || trimmedChangelogBody === trimmedReleaseNotesBody) {
        return trimmedReleaseNotesBody
      }

      return joinTemplateSections([
        trimmedReleaseNotesBody,
        "## Included changes",
        trimmedChangelogBody,
      ])
    }
    case "customer_update":
      return draft.releaseNotesBody
    case "help_center_update":
      return draft.changelogBody
    default:
      return draft.releaseNotesBody
  }
}

export function buildReleaseDraftEditorFields(
  draft: NonNullable<ReleaseWorkflowDetail["currentDraft"]>,
): ReleaseWorkflowDraftFieldSnapshot[] {
  const template = getReleaseDraftTemplateOption(draft.templateId)
  const normalizedFieldSnapshots = template.fields
    .map((field, index) => {
      const matchingFieldSnapshot = draft.fieldSnapshots.find(
        (fieldSnapshot) => fieldSnapshot.fieldKey === field.key,
      )

      if (matchingFieldSnapshot) {
        return matchingFieldSnapshot
      }

      return {
        content: buildDraftDisplayContent(draft),
        contentFormat: "markdown" as const,
        fieldKey: field.key,
        label: field.label,
        plainText: buildDraftDisplayContent(draft),
        sortOrder: index,
      }
    })
    .filter((fieldSnapshot) => fieldSnapshot.content.trim().length > 0)

  return normalizedFieldSnapshots.length > 0
    ? normalizedFieldSnapshots
    : [
        {
          content: buildDraftDisplayContent(draft),
          contentFormat: "markdown",
          fieldKey: template.fields[0]?.key ?? "body",
          label: template.fields[0]?.label ?? template.label,
          plainText: buildDraftDisplayContent(draft),
          sortOrder: 0,
        },
      ]
}
