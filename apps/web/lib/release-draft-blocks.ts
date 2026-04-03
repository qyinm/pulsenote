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

type ReleaseDraftTextNode = {
  text: string
  type: "text"
}

type ReleaseDraftParagraphNode = {
  content?: ReleaseDraftTextNode[]
  type: "paragraph"
}

type ReleaseDraftHeadingNode = {
  attrs?: {
    level?: number
  }
  content?: ReleaseDraftTextNode[]
  type: "heading"
}

type ReleaseDraftListItemNode = {
  content?: ReleaseDraftParagraphNode[]
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

let nextBlockId = 0

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function extractNodeText(node: unknown): string {
  const record = asRecord(node)

  if (!record) {
    return ""
  }

  if (record.type === "text" && typeof record.text === "string") {
    return record.text
  }

  if (Array.isArray(record.content)) {
    return record.content.map((child) => extractNodeText(child)).join("")
  }

  return ""
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

function parseLegacyBlocks(content: string, contentFormat: "markdown" | "plain_text") {
  if (contentFormat === "plain_text") {
    const paragraphs = splitParagraphs(content)

    return paragraphs.length > 0
      ? paragraphs.map((paragraph) => createBlock("paragraph", paragraph))
      : [createBlock("paragraph")]
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

function parseStructuredBlocks(content: string): ReleaseDraftBlock[] {
  try {
    const parsed = JSON.parse(content) as ReleaseDraftDocNode

    if (!parsed || parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return [createBlock("paragraph", content)]
    }

    const blocks: ReleaseDraftBlock[] = []

    for (const node of parsed.content) {
      if (node.type === "paragraph") {
        blocks.push(createBlock("paragraph", extractNodeText(node)))
        continue
      }

      if (node.type === "heading") {
        blocks.push(createBlock("heading", extractNodeText(node)))
        continue
      }

      if (node.type === "bulletList") {
        for (const item of node.content ?? []) {
          blocks.push(createBlock("bullet", extractNodeText(item)))
        }
      }
    }

    return blocks.length > 0 ? blocks : [createBlock("paragraph")]
  } catch {
    return [createBlock("paragraph", content)]
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
  if (contentFormat === "tiptap_json") {
    return parseStructuredBlocks(content)
  }

  return parseLegacyBlocks(content, contentFormat)
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

export function serializeReleaseDraftBlocks(blocks: ReleaseDraftBlock[]) {
  const content: NonNullable<ReleaseDraftDocNode["content"]> = []
  let bulletBuffer: ReleaseDraftBlock[] = []

  function flushBulletBuffer() {
    if (bulletBuffer.length === 0) {
      return
    }

    content.push({
      content: bulletBuffer.map((block) => ({
        content: [
          {
            content:
              normalizeBlockText(block.text).length > 0
                ? [{ text: normalizeBlockText(block.text), type: "text" as const }]
                : [],
            type: "paragraph" as const,
          },
        ],
        type: "listItem" as const,
      })),
      type: "bulletList",
    })

    bulletBuffer = []
  }

  for (const block of blocks) {
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

  return JSON.stringify({
    content,
    type: "doc",
  } satisfies ReleaseDraftDocNode)
}

export function buildReleaseDraftStructuredFieldValue(
  content: string,
  contentFormat: "markdown" | "plain_text" | "tiptap_json",
): ReleaseDraftStructuredFieldValue {
  const blocks = parseReleaseDraftBlocks(content, contentFormat)

  return buildReleaseDraftStructuredFieldValueFromBlocks(blocks)
}

export function buildReleaseDraftStructuredFieldValueFromBlocks(
  blocks: ReleaseDraftBlock[],
): ReleaseDraftStructuredFieldValue {
  const normalizedBlocks = blocks.length > 0 ? blocks : [createBlock("paragraph")]

  return {
    content: serializeReleaseDraftBlocks(normalizedBlocks),
    contentFormat: "tiptap_json",
    plainText: extractReleaseDraftPlainText(normalizedBlocks),
  }
}

export function deriveReleaseDraftPlainText(
  content: string,
  contentFormat: "markdown" | "plain_text" | "tiptap_json",
) {
  return extractReleaseDraftPlainText(parseReleaseDraftBlocks(content, contentFormat))
}

export function getReleaseDraftDisplayLabel(type: ReleaseDraftBlockType) {
  return releaseDraftBlockCommandDefinitions.find((command) => command.type === type)?.label ?? "Text"
}
