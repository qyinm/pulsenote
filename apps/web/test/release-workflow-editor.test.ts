import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ReleaseDraftBlockRenderer } from "../components/dashboard/release-draft-block-renderer.js"
import {
  buildReleaseDraftStructuredFieldValue,
  buildReleaseDraftStructuredFieldValueFromBlocks,
  getReleaseDraftBlockDocumentState,
  getReleaseDraftBlockCommandQuery,
  getReleaseDraftBlockCommands,
  parseReleaseDraftBlocks,
} from "../lib/release-draft-blocks.js"

test("release draft block helpers keep slash-command discovery explicit", () => {
  assert.equal(getReleaseDraftBlockCommandQuery("/head"), "head")
  assert.equal(getReleaseDraftBlockCommandQuery("Launch readiness"), null)

  assert.equal(getReleaseDraftBlockCommands("head")[0]?.type, "heading")
  assert.equal(getReleaseDraftBlockCommands("bullet")[0]?.type, "bullet")
  assert.equal(getReleaseDraftBlockCommands("p")[0]?.type, "paragraph")
})

test("structured draft values keep deterministic plain text and stable supported blocks", () => {
  const blocks = [
    { id: "block_1", text: "Launch readiness", type: "heading" as const },
    { id: "block_2", text: "Customers can onboard faster.", type: "paragraph" as const },
    { id: "block_3", text: "Fewer manual review steps", type: "bullet" as const },
    { id: "block_4", text: "Deterministic publish packs", type: "bullet" as const },
  ]

  const firstValue = buildReleaseDraftStructuredFieldValueFromBlocks(blocks)
  const secondValue = buildReleaseDraftStructuredFieldValueFromBlocks(blocks)
  const parsedBlocks = parseReleaseDraftBlocks(firstValue.content, "tiptap_json")

  assert.equal(
    firstValue.plainText,
    "Launch readiness\n\nCustomers can onboard faster.\n\n- Fewer manual review steps\n- Deterministic publish packs",
  )
  assert.equal(firstValue.content, secondValue.content)
  assert.equal(firstValue.plainText, secondValue.plainText)
  assert.deepEqual(
    parsedBlocks.map((block) => ({ text: block.text, type: block.type })),
    blocks.map((block) => ({ text: block.text, type: block.type })),
  )
})

test("release draft block renderer uses structured output for tiptap_json and safe fallback for legacy content", () => {
  const structuredValue = buildReleaseDraftStructuredFieldValueFromBlocks([
    { id: "block_1", text: "Launch readiness", type: "heading" },
    { id: "block_2", text: "Customers can onboard faster.", type: "paragraph" },
    { id: "block_3", text: "Deterministic publish packs", type: "bullet" },
  ])

  const structuredMarkup = renderToStaticMarkup(
    ReleaseDraftBlockRenderer({
      content: structuredValue.content,
      contentFormat: "tiptap_json",
    }),
  )
  const markdownMarkup = renderToStaticMarkup(
    ReleaseDraftBlockRenderer({
      content: "## Launch readiness\n\nCustomers can onboard faster.",
      contentFormat: "markdown",
    }),
  )
  const plainTextMarkup = renderToStaticMarkup(
    ReleaseDraftBlockRenderer({
      content: "Launch readiness\n\nCustomers can onboard faster.",
      contentFormat: "plain_text",
    }),
  )

  assert.match(structuredMarkup, /<h2[^>]*>Launch readiness<\/h2>/)
  assert.match(structuredMarkup, /<ul[^>]*>/)
  assert.doesNotMatch(structuredMarkup, /type&quot;:&quot;doc&quot;/)

  assert.match(markdownMarkup, /Launch readiness/)
  assert.match(markdownMarkup, /Customers can onboard faster/)
  assert.match(plainTextMarkup, /Launch readiness/)
  assert.match(plainTextMarkup, /Customers can onboard faster/)
})

test("unsupported structured draft nodes stay visible and read-only", () => {
  const orderedListDocument = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "orderedList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "First item" }],
              },
            ],
          },
        ],
      },
    ],
  })

  const documentState = getReleaseDraftBlockDocumentState(orderedListDocument, "tiptap_json")
  const renderedMarkup = renderToStaticMarkup(
    ReleaseDraftBlockRenderer({
      content: orderedListDocument,
      contentFormat: "tiptap_json",
    }),
  )

  assert.equal(documentState.isEditable, false)
  assert.match(renderedMarkup, /read-only/i)
  assert.match(renderedMarkup, /First item/)
  assert.deepEqual(
    parseReleaseDraftBlocks(orderedListDocument, "tiptap_json").map((block) => ({
      text: block.text,
      type: block.type,
    })),
    [{ text: "First item", type: "bullet" }],
  )
})

test("malformed structured draft content stays preserved instead of being rewritten", () => {
  const malformedStructuredContent = "{\"type\":\"doc\",\"content\":["
  const structuredValue = buildReleaseDraftStructuredFieldValue(
    malformedStructuredContent,
    "tiptap_json",
  )
  const documentState = getReleaseDraftBlockDocumentState(
    malformedStructuredContent,
    "tiptap_json",
  )

  assert.equal(documentState.isEditable, false)
  assert.match(documentState.notice ?? "", /read-only/i)
  assert.equal(structuredValue.content, malformedStructuredContent)
  assert.equal(structuredValue.contentFormat, "tiptap_json")
  assert.equal(structuredValue.plainText, malformedStructuredContent)
})
