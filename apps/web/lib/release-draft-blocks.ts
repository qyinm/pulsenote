import type { JSONContent } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"

export const releaseDraftBlockCommandDefinitions = [
  {
    aliases: ["p", "paragraph", "text"],
    description: "Add a standard body paragraph.",
    label: "Text",
    type: "paragraph",
  },
  {
    aliases: ["h", "heading", "title"],
    description: "Add a release section heading.",
    label: "Heading",
    type: "heading",
  },
  {
    aliases: ["bullet", "bullets", "list"],
    description: "Add a bullet list item.",
    label: "Bullet list",
    type: "bullet",
  },
] as const

export type ReleaseDraftBlockType = (typeof releaseDraftBlockCommandDefinitions)[number]["type"]

export type ReleaseDraftBlock = {
  id: string
  text: string
  type: ReleaseDraftBlockType
}

type ReleaseDraftParagraphNode = {
  content?: JSONContent[]
  type: "paragraph"
}

type ReleaseDraftHeadingNode = {
  attrs?: {
    level?: number
  }
  content?: JSONContent[]
  type: "heading"
}

type ReleaseDraftListItemNode = {
  content?: JSONContent[]
  type: "listItem"
}

type ReleaseDraftBulletListNode = {
  content?: ReleaseDraftListItemNode[]
  type: "bulletList"
}

type ReleaseDraftDocNode = {
  content?: Array<ReleaseDraftParagraphNode | ReleaseDraftHeadingNode | ReleaseDraftBulletListNode>
  type: "doc"
}

export type ReleaseDraftStructuredFieldValue = {
  content: string
  contentFormat: "tiptap_json"
  plainText: string
}

export type ReleaseDraftBlockDocumentState = {
  blocks: ReleaseDraftBlock[]
  document: JSONContent
  renderDocument: JSONContent
  isEditable: boolean
  notice: string | null
}

let nextBlockId = 0

export const releaseDraftTiptapExtensions = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    orderedList: false,
  }),
]

function createBlockId() {
  nextBlockId += 1
  return `draft_block_${nextBlockId}`
}

function createBlock(type: ReleaseDraftBlockType, text = ""): ReleaseDraftBlock {
  return {
    id: createBlockId(),
    text,
    type,
  }
}

function createEmptyDocument(): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n")
}

function normalizeBlockText(value: string) {
  return normalizeText(value).trimEnd()
}

function splitParagraphs(value: string) {
  return normalizeText(value)
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function buildParagraphBlocks(value: string) {
  const paragraphs = splitParagraphs(value)

  return paragraphs.length > 0
    ? paragraphs.map((paragraph) => createBlock("paragraph", paragraph))
    : [createBlock("paragraph")]
}

function buildDocumentFromParagraphBlocks(blocks: ReleaseDraftBlock[]): JSONContent {
  const normalizedBlocks = blocks.length > 0 ? blocks : [createBlock("paragraph")]
  const content: NonNullable<ReleaseDraftDocNode["content"]> = []
  let bulletBuffer: ReleaseDraftBlock[] = []

  function flushBulletBuffer() {
    if (bulletBuffer.length === 0) {
      return
    }

    content.push({
      content: bulletBuffer.map((block) => {
        const text = normalizeBlockText(block.text)

        return {
          content: [
            {
              content: text.length > 0 ? [{ text, type: "text" as const }] : [],
              type: "paragraph" as const,
            },
          ],
          type: "listItem" as const,
        }
      }),
      type: "bulletList",
    })

    bulletBuffer = []
  }

  for (const block of normalizedBlocks) {
    const text = normalizeBlockText(block.text)

    if (block.type === "bullet") {
      bulletBuffer.push({ ...block, text })
      continue
    }

    flushBulletBuffer()

    if (block.type === "heading") {
      content.push({
        attrs: { level: 2 },
        content: text.length > 0 ? [{ text, type: "text" }] : [],
        type: "heading",
      })
      continue
    }

    content.push({
      content: text.length > 0 ? [{ text, type: "text" }] : [],
      type: "paragraph",
    })
  }

  flushBulletBuffer()

  return {
    content,
    type: "doc",
  } satisfies ReleaseDraftDocNode
}

function extractNodeText(node: unknown): string {
  const record = asRecord(node)

  if (!record) {
    return ""
  }

  if (record.type === "hardBreak") {
    return "\n"
  }

  if (record.type === "text" && typeof record.text === "string") {
    return record.text
  }

  if (Array.isArray(record.content)) {
    return record.content.map((child) => extractNodeText(child)).join("")
  }

  return ""
}

function parseLegacyBlocks(content: string, contentFormat: "markdown" | "plain_text") {
  if (contentFormat === "plain_text") {
    return buildParagraphBlocks(content)
  }

  const blocks: ReleaseDraftBlock[] = []
  const paragraphLines: string[] = []

  function flushParagraph() {
    const paragraph = paragraphLines.join("\n").trim()

    if (paragraph.length > 0) {
      blocks.push(createBlock("paragraph", paragraph))
    }

    paragraphLines.length = 0
  }

  for (const rawLine of normalizeText(content).split("\n")) {
    const line = rawLine.trimEnd()

    if (line.trim().length === 0) {
      flushParagraph()
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)

    if (headingMatch) {
      flushParagraph()
      blocks.push(createBlock("heading", headingMatch[2]?.trim() ?? ""))
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/)

    if (bulletMatch) {
      flushParagraph()
      blocks.push(createBlock("bullet", bulletMatch[1]?.trim() ?? ""))
      continue
    }

    paragraphLines.push(line)
  }

  flushParagraph()

  return blocks.length > 0 ? blocks : [createBlock("paragraph")]
}

function isSupportedStructuredNodeType(type: unknown) {
  return (
    type === "doc" ||
    type === "paragraph" ||
    type === "text" ||
    type === "heading" ||
    type === "bulletList" ||
    type === "listItem" ||
    type === "hardBreak"
  )
}

function hasUnsupportedStructuredContent(node: unknown): boolean {
  const record = asRecord(node)

  if (!record) {
    return true
  }

  if (!isSupportedStructuredNodeType(record.type)) {
    return true
  }

  if (Array.isArray(record.content)) {
    return record.content.some((child) => hasUnsupportedStructuredContent(child))
  }

  return false
}

function parseStructuredNode(node: Record<string, unknown>) {
  if (node.type === "paragraph") {
    return {
      blocks: [createBlock("paragraph", extractNodeText(node))],
      hasUnsupportedContent: false,
    }
  }

  if (node.type === "heading") {
    return {
      blocks: [createBlock("heading", extractNodeText(node))],
      hasUnsupportedContent: false,
    }
  }

  if (node.type === "bulletList") {
    return {
      blocks: Array.isArray(node.content)
        ? node.content.map((item: unknown) => createBlock("bullet", extractNodeText(item)))
        : [],
      hasUnsupportedContent: false,
    }
  }

  if (node.type === "orderedList") {
    return {
      blocks: Array.isArray(node.content)
        ? node.content.map((item: unknown) => createBlock("bullet", extractNodeText(item)))
        : [],
      hasUnsupportedContent: true,
    }
  }

  const fallbackText = extractNodeText(node).trim()

  return {
    blocks: fallbackText.length > 0 ? [createBlock("paragraph", fallbackText)] : [],
    hasUnsupportedContent: true,
  }
}

function blocksFromStructuredDocument(document: JSONContent) {
  const content = Array.isArray(document.content) ? document.content : []
  const blocks: ReleaseDraftBlock[] = []
  let hasUnsupportedContent = false

  for (const node of content) {
    const parsedNode = parseStructuredNode((node ?? {}) as Record<string, unknown>)
    blocks.push(...parsedNode.blocks)
    hasUnsupportedContent = hasUnsupportedContent || parsedNode.hasUnsupportedContent
  }

  return {
    blocks: blocks.length > 0 ? blocks : [createBlock("paragraph")],
    hasUnsupportedContent,
  }
}

function parseStructuredBlocks(content: string): ReleaseDraftBlockDocumentState {
  try {
    const parsed = JSON.parse(content) as JSONContent

    if (!parsed || parsed.type !== "doc") {
      const blocks = buildParagraphBlocks(content)
      const renderDocument = buildDocumentFromParagraphBlocks(blocks)

      return {
        blocks,
        document: createEmptyDocument(),
        renderDocument,
        isEditable: false,
        notice:
          "PulseNote could not validate this structured draft. It is shown read-only so the original content stays intact.",
      }
    }

    const hasUnsupportedContent = hasUnsupportedStructuredContent(parsed)
    const { blocks } = blocksFromStructuredDocument(parsed)
    const renderDocument = hasUnsupportedContent
      ? buildDocumentFromParagraphBlocks(blocks)
      : parsed

    return {
      blocks,
      document: parsed,
      renderDocument,
      isEditable: !hasUnsupportedContent,
      notice: hasUnsupportedContent
        ? "PulseNote can show this structured draft, but it stays read-only until unsupported block types are removed."
        : null,
    }
  } catch {
    const blocks = buildParagraphBlocks(content)
    const renderDocument = buildDocumentFromParagraphBlocks(blocks)

    return {
      blocks,
      document: createEmptyDocument(),
      renderDocument,
      isEditable: false,
      notice:
        "PulseNote could not parse this structured draft. It is shown read-only so the original content stays intact.",
    }
  }
}

export function getReleaseDraftBlockDocumentState(
  content: string,
  contentFormat: "markdown" | "plain_text" | "tiptap_json",
): ReleaseDraftBlockDocumentState {
  if (contentFormat === "tiptap_json") {
    return parseStructuredBlocks(content)
  }

  const blocks = parseLegacyBlocks(content, contentFormat)

  return {
    blocks,
    document: buildDocumentFromParagraphBlocks(blocks),
    renderDocument: buildDocumentFromParagraphBlocks(blocks),
    isEditable: true,
    notice: null,
  }
}

export function getReleaseDraftBlockCommandQuery(value: string) {
  const trimmed = value.trim()

  if (!/^\/[a-z-]*$/i.test(trimmed)) {
    return null
  }

  return trimmed.slice(1).toLowerCase()
}

export function getReleaseDraftBlockCommands(query: string | null | undefined) {
  const normalizedQuery = (query ?? "").trim().toLowerCase()

  return releaseDraftBlockCommandDefinitions.filter((command) =>
    normalizedQuery.length === 0
      ? true
      : command.aliases.some((alias) => alias.startsWith(normalizedQuery)),
  )
}

export function parseReleaseDraftBlocks(
  content: string,
  contentFormat: "markdown" | "plain_text" | "tiptap_json",
) {
  return getReleaseDraftBlockDocumentState(content, contentFormat).blocks
}

export function extractReleaseDraftPlainText(blocks: ReleaseDraftBlock[]) {
  const sections: string[] = []
  let bulletBuffer: string[] = []

  function flushBulletBuffer() {
    if (bulletBuffer.length > 0) {
      sections.push(bulletBuffer.join("\n"))
      bulletBuffer = []
    }
  }

  for (const block of blocks) {
    const text = normalizeBlockText(block.text).trim()

    if (text.length === 0) {
      continue
    }

    if (block.type === "bullet") {
      bulletBuffer.push(`- ${text}`)
      continue
    }

    flushBulletBuffer()
    sections.push(text)
  }

  flushBulletBuffer()

  return sections.join("\n\n")
}

export function extractReleaseDraftPlainTextFromDocument(document: JSONContent) {
  return extractReleaseDraftPlainText(blocksFromStructuredDocument(document).blocks)
}

export function serializeReleaseDraftBlocks(blocks: ReleaseDraftBlock[]) {
  return JSON.stringify(buildDocumentFromParagraphBlocks(blocks))
}

function normalizeTiptapDocument(document: JSONContent) {
  if (document.type !== "doc") {
    return createEmptyDocument()
  }

  if (!Array.isArray(document.content) || document.content.length === 0) {
    return createEmptyDocument()
  }

  return document
}

export function buildReleaseDraftStructuredFieldValue(
  content: string,
  contentFormat: "markdown" | "plain_text" | "tiptap_json",
): ReleaseDraftStructuredFieldValue {
  const documentState = getReleaseDraftBlockDocumentState(content, contentFormat)

  if (contentFormat === "tiptap_json" && !documentState.isEditable) {
    return {
      content,
      contentFormat: "tiptap_json",
      plainText: extractReleaseDraftPlainText(documentState.blocks),
    }
  }

  return buildReleaseDraftStructuredFieldValueFromDocument(documentState.document)
}

export function buildReleaseDraftStructuredFieldValueFromDocument(
  document: JSONContent,
): ReleaseDraftStructuredFieldValue {
  const normalizedDocument = normalizeTiptapDocument(document)

  return {
    content: JSON.stringify(normalizedDocument),
    contentFormat: "tiptap_json",
    plainText: extractReleaseDraftPlainTextFromDocument(normalizedDocument),
  }
}

export function buildReleaseDraftStructuredFieldValueFromBlocks(
  blocks: ReleaseDraftBlock[],
): ReleaseDraftStructuredFieldValue {
  return buildReleaseDraftStructuredFieldValueFromDocument(buildDocumentFromParagraphBlocks(blocks))
}

export function deriveReleaseDraftPlainText(
  content: string,
  contentFormat: "markdown" | "plain_text" | "tiptap_json",
) {
  return extractReleaseDraftPlainText(getReleaseDraftBlockDocumentState(content, contentFormat).blocks)
}

export function getReleaseDraftDisplayLabel(type: ReleaseDraftBlockType) {
  return releaseDraftBlockCommandDefinitions.find((command) => command.type === type)?.label ?? "Text"
}
