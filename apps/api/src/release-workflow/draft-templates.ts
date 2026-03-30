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
    description: "A release-ready packet with both release notes and a changelog section.",
    fields: [
      {
        defaultContentFormat: "markdown",
        description: "Public-facing release notes for the shipped update.",
        key: "release_notes",
        label: "Release notes",
        placeholder: "Summarize the shipped release in customer-facing language.",
        required: true,
      },
      {
        defaultContentFormat: "markdown",
        description: "A concrete changelog entry grounded in shipped changes.",
        key: "changelog",
        label: "Changelog",
        placeholder: "List the concrete shipped changes and evidence-backed notes.",
        required: true,
      },
    ],
    id: "release_note_packet",
    label: "Release notes packet",
    outputType: "publish_pack",
    version: 1,
  },
  {
    description: "A direct customer update with a subject, summary, and detailed body.",
    fields: [
      {
        defaultContentFormat: "plain_text",
        description: "The subject line or short heading for the customer update.",
        key: "subject",
        label: "Subject",
        placeholder: "Summarize the release in one clear line.",
        required: true,
      },
      {
        defaultContentFormat: "markdown",
        description: "A short preview of what changed for customers.",
        key: "summary",
        label: "Summary",
        placeholder: "Anchor the update to the shipped scope and key outcomes.",
        required: true,
      },
      {
        defaultContentFormat: "markdown",
        description: "The detailed customer-facing update body.",
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
    description: "A help-center style update with a title, summary, and article-ready body.",
    fields: [
      {
        defaultContentFormat: "plain_text",
        description: "The visible title for the help-center update.",
        key: "title",
        label: "Title",
        placeholder: "Name the shipped release update clearly.",
        required: true,
      },
      {
        defaultContentFormat: "markdown",
        description: "A short summary for the knowledge-base entry.",
        key: "summary",
        label: "Summary",
        placeholder: "Give a concise overview of the shipped change.",
        required: true,
      },
      {
        defaultContentFormat: "markdown",
        description: "The help-center body that explains the update in more detail.",
        key: "article_update",
        label: "Article update",
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

export function buildDraftTemplateFields(input: {
  changelogBody: string
  releaseNotesBody: string
  releaseSnapshot: ReleaseRecordSnapshot
  template: DraftTemplateDefinition
}): DraftFieldSnapshot[] {
  const { changelogBody, releaseNotesBody, releaseSnapshot, template } = input
  const summary = extractPrimarySummaryText(releaseSnapshot.releaseRecord.summary, stripMarkdown(releaseNotesBody))

  switch (template.id) {
    case "release_note_packet":
      return [
        createFieldSnapshot(template, "release_notes", releaseNotesBody, 0),
        createFieldSnapshot(template, "changelog", changelogBody, 1),
      ]
    case "customer_update":
      return [
        createFieldSnapshot(template, "subject", releaseSnapshot.releaseRecord.title, 0),
        createFieldSnapshot(template, "summary", summary, 1),
        createFieldSnapshot(template, "customer_update", releaseNotesBody, 2),
      ]
    case "help_center_update":
      return [
        createFieldSnapshot(template, "title", releaseSnapshot.releaseRecord.title, 0),
        createFieldSnapshot(template, "summary", summary, 1),
        createFieldSnapshot(template, "article_update", changelogBody, 2),
      ]
    default:
      throw new Error(`Unknown draft template id: ${template.id}`)
  }
}

export function projectDraftBodiesFromFields(
  template: DraftTemplateDefinition,
  fieldSnapshots: DraftFieldSnapshot[],
) {
  const byKey = new Map(fieldSnapshots.map((field) => [field.fieldKey, field.content]))

  if (template.id === "release_note_packet") {
    return {
      changelogBody: byKey.get("changelog") ?? "",
      releaseNotesBody: byKey.get("release_notes") ?? "",
    }
  }

  const orderedContent = [...fieldSnapshots]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((field) => field.content.trim())
    .filter((content) => content.length > 0)

  const joinedContent = orderedContent.join("\n\n")

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
