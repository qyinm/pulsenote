import type {
  DraftContentFormat,
  DraftEvidenceRef,
  DraftFieldSnapshot,
} from "../domain/models.js"
import type { ReleaseRecordSnapshot } from "../foundation/store.js"

export type DraftTemplateFieldDefinition = {
  defaultContentFormat: DraftContentFormat
  description: string
  key: string
  label: string
  placeholder: string
  required: boolean
}

export type DraftTemplateDefinition = {
  description: string
  id: string
  label: string
  outputType: string
  version: number
  fields: DraftTemplateFieldDefinition[]
}

export const releaseDraftTemplates = [
  {
    description: "A single publish-pack draft grounded in the selected release scope.",
    fields: [
      {
        defaultContentFormat: "markdown",
        description: "The full publish-pack draft for this release.",
        key: "publish_pack",
        label: "Publish pack",
        placeholder: "Write the release-ready publish pack grounded in shipped evidence.",
        required: true,
      },
    ],
    id: "release_note_packet",
    label: "Release notes packet",
    outputType: "publish_pack",
    version: 1,
  },
  {
    description: "A single customer-facing update draft for the shipped release.",
    fields: [
      {
        defaultContentFormat: "markdown",
        description: "The full customer-facing update content.",
        key: "customer_update",
        label: "Customer update",
        placeholder: "Explain what shipped, why it matters, and any rollout notes.",
        required: true,
      },
    ],
    id: "customer_update",
    label: "Customer update",
    outputType: "customer_update",
    version: 1,
  },
  {
    description: "A single help-center update draft for the shipped release.",
    fields: [
      {
        defaultContentFormat: "markdown",
        description: "The full help-center update content.",
        key: "help_center_update",
        label: "Help center update",
        placeholder: "Document the shipped behavior, rollout details, and known limits.",
        required: true,
      },
    ],
    id: "help_center_update",
    label: "Help center update",
    outputType: "help_center_update",
    version: 1,
  },
] as const satisfies DraftTemplateDefinition[]

export const defaultReleaseDraftTemplateId = "release_note_packet"

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[`*_>#]/g, "")
    .trim()
}

function pickTemplateField(template: DraftTemplateDefinition, fieldKey: string) {
  return template.fields.find((field) => field.key === fieldKey) ?? null
}

export function getReleaseDraftTemplate(templateId: string | null | undefined) {
  if (!templateId) {
    return releaseDraftTemplates.find((template) => template.id === defaultReleaseDraftTemplateId) ?? releaseDraftTemplates[0]
  }

  return (
    releaseDraftTemplates.find((template) => template.id === templateId) ??
    releaseDraftTemplates.find((template) => template.id === defaultReleaseDraftTemplateId) ??
    releaseDraftTemplates[0]
  )
}

export function isReleaseDraftTemplateId(value: string): value is DraftTemplateDefinition["id"] {
  return releaseDraftTemplates.some((template) => template.id === value)
}

function createFieldSnapshot(
  template: DraftTemplateDefinition,
  fieldKey: string,
  content: string,
  sortOrder: number,
): DraftFieldSnapshot {
  const field = pickTemplateField(template, fieldKey)

  return {
    content,
    contentFormat: field?.defaultContentFormat ?? "markdown",
    fieldKey,
    label: field?.label ?? fieldKey,
    plainText: stripMarkdown(content),
    sortOrder,
  }
}

function extractPrimarySummaryText(summary: string | null, fallback: string) {
  const trimmedSummary = summary?.trim()

  if (trimmedSummary && trimmedSummary.length > 0) {
    return trimmedSummary
  }

  return fallback.trim()
}

function joinTemplateSections(sections: Array<string | null | undefined>) {
  const normalizedSections = sections
    .map((section) => section?.trim() ?? "")
    .filter((section) => section.length > 0)

  return normalizedSections.join("\n\n")
}

function buildPublishPackContent(releaseNotesBody: string, changelogBody: string) {
  const trimmedReleaseNotesBody = releaseNotesBody.trim()
  const trimmedChangelogBody = changelogBody.trim()

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

function buildTemplateOutputContent(input: {
  changelogBody: string
  releaseNotesBody: string
  releaseSnapshot: ReleaseRecordSnapshot
  template: DraftTemplateDefinition
}) {
  const summary = extractPrimarySummaryText(
    input.releaseSnapshot.releaseRecord.summary,
    stripMarkdown(input.releaseNotesBody),
  )

  switch (input.template.id) {
    case "release_note_packet":
      return buildPublishPackContent(input.releaseNotesBody, input.changelogBody)
    case "customer_update":
      return joinTemplateSections([
        input.releaseSnapshot.releaseRecord.title,
        summary,
        input.releaseNotesBody,
      ])
    case "help_center_update":
      return joinTemplateSections([
        input.releaseSnapshot.releaseRecord.title,
        summary,
        input.changelogBody,
      ])
    default:
      throw new Error(`Unknown draft template id: ${input.template.id}`)
  }
}

function buildLegacyTemplateOutputContent(
  template: DraftTemplateDefinition,
  existingFieldSnapshotByKey: Map<string, DraftFieldSnapshot>,
) {
  switch (template.id) {
    case "release_note_packet":
      return buildPublishPackContent(
        existingFieldSnapshotByKey.get("release_notes")?.content ?? "",
        existingFieldSnapshotByKey.get("changelog")?.content ?? "",
      )
    case "customer_update":
      return joinTemplateSections([
        existingFieldSnapshotByKey.get("subject")?.content ?? "",
        existingFieldSnapshotByKey.get("summary")?.content ?? "",
        existingFieldSnapshotByKey.get("customer_update")?.content ?? "",
      ])
    case "help_center_update":
      return joinTemplateSections([
        existingFieldSnapshotByKey.get("title")?.content ?? "",
        existingFieldSnapshotByKey.get("summary")?.content ?? "",
        existingFieldSnapshotByKey.get("article_update")?.content ?? "",
      ])
    default:
      throw new Error(`Unknown draft template id: ${template.id}`)
  }
}

export function buildDraftTemplateFields(input: {
  changelogBody: string
  releaseNotesBody: string
  releaseSnapshot: ReleaseRecordSnapshot
  template: DraftTemplateDefinition
}): DraftFieldSnapshot[] {
  return [
    createFieldSnapshot(
      input.template,
      input.template.fields[0]?.key ?? "body",
      buildTemplateOutputContent(input),
      0,
    ),
  ]
}

export function normalizeDraftTemplateFieldSnapshots(
  template: DraftTemplateDefinition,
  fieldSnapshots: DraftFieldSnapshot[],
  existingFieldSnapshots: DraftFieldSnapshot[] = [],
): DraftFieldSnapshot[] {
  const existingFieldSnapshotByKey = new Map(
    existingFieldSnapshots.map((fieldSnapshot) => [fieldSnapshot.fieldKey, fieldSnapshot]),
  )
  const nextFieldSnapshotByKey = new Map(fieldSnapshots.map((fieldSnapshot) => [fieldSnapshot.fieldKey, fieldSnapshot]))

  return template.fields.map((field, index) => {
    const nextFieldSnapshot =
      nextFieldSnapshotByKey.get(field.key) ?? existingFieldSnapshotByKey.get(field.key) ?? null
    const nextContent =
      nextFieldSnapshot?.content ??
      (template.fields.length === 1
        ? buildLegacyTemplateOutputContent(template, existingFieldSnapshotByKey)
        : "")

    return {
      content: nextContent,
      contentFormat: nextFieldSnapshot?.contentFormat ?? field.defaultContentFormat,
      fieldKey: field.key,
      label: field.label,
      plainText: stripMarkdown(nextContent),
      sortOrder: index,
    }
  })
}

export function projectDraftBodiesFromFields(
  template: DraftTemplateDefinition,
  fieldSnapshots: DraftFieldSnapshot[],
) {
  const byKey = new Map(fieldSnapshots.map((field) => [field.fieldKey, field.content]))

  if (template.id === "release_note_packet") {
    const publishPackBody = byKey.get("publish_pack") ?? ""

    return {
      changelogBody: publishPackBody,
      releaseNotesBody: publishPackBody,
    }
  }
  const joinedContent = [...fieldSnapshots]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((field) => field.content.trim())
    .filter((content) => content.length > 0)
    .join("\n\n")

  return {
    changelogBody: joinedContent,
    releaseNotesBody: joinedContent,
  }
}

export function createDraftEvidenceRefs(
  releaseSnapshot: ReleaseRecordSnapshot,
  fieldSnapshots: DraftFieldSnapshot[],
): DraftEvidenceRef[] {
  const preferredFieldKeys = fieldSnapshots
    .filter((fieldSnapshot) => !["subject", "title"].includes(fieldSnapshot.fieldKey))
    .map((fieldSnapshot) => fieldSnapshot.fieldKey)
  const targetFieldKeys =
    preferredFieldKeys.length > 0
      ? preferredFieldKeys
      : fieldSnapshots.map((fieldSnapshot) => fieldSnapshot.fieldKey)

  if (targetFieldKeys.length === 0) {
    return []
  }

  const createdAt = new Date().toISOString()

  return releaseSnapshot.evidenceBlocks.map((evidenceBlock, index) => {
    const normalizedSourceRef = evidenceBlock.sourceRef.trim()
    const linkedSource = releaseSnapshot.sourceLinks.find(
      (sourceLink) =>
        sourceLink.label === evidenceBlock.title ||
        (normalizedSourceRef.length > 0 && sourceLink.label.includes(normalizedSourceRef)),
    )

    return {
      anchorText: null,
      createdAt,
      evidenceBlockId: evidenceBlock.id,
      fieldKey: targetFieldKeys[index % targetFieldKeys.length]!,
      id: crypto.randomUUID(),
      note: null,
      sourceLinkId: linkedSource?.id ?? null,
    }
  })
}
