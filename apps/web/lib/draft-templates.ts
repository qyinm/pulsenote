export type ReleaseDraftTemplateOption = {
  description: string
  fields: Array<{
    key: string
    label: string
  }>
  id: string
  label: string
}

export const releaseDraftTemplateOptions = [
  {
    description: "Bundle release notes and a changelog into one reviewable publish pack draft.",
    fields: [
      { key: "release_notes", label: "Release notes" },
      { key: "changelog", label: "Changelog" },
    ],
    id: "release_note_packet",
    label: "Release notes packet",
  },
  {
    description: "Write a customer-facing update with a subject, summary, and detailed body.",
    fields: [
      { key: "subject", label: "Subject" },
      { key: "summary", label: "Summary" },
      { key: "customer_update", label: "Customer update" },
    ],
    id: "customer_update",
    label: "Customer update",
  },
  {
    description: "Draft a help-center style update with a title, summary, and article body.",
    fields: [
      { key: "title", label: "Title" },
      { key: "summary", label: "Summary" },
      { key: "article_update", label: "Article update" },
    ],
    id: "help_center_update",
    label: "Help center update",
  },
] as const satisfies ReleaseDraftTemplateOption[]

export function getReleaseDraftTemplateOption(templateId: string | null | undefined) {
  return (
    releaseDraftTemplateOptions.find((template) => template.id === templateId) ??
    releaseDraftTemplateOptions[0]
  )
}
