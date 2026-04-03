"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ReleaseDraftBlockRenderer } from "@/components/dashboard/release-draft-block-renderer"
import {
  buildReleaseDraftStructuredFieldValueFromBlocks,
  getReleaseDraftBlockDocumentState,
  getReleaseDraftBlockCommandQuery,
  getReleaseDraftBlockCommands,
  getReleaseDraftDisplayLabel,
  type ReleaseDraftBlock,
  type ReleaseDraftBlockType,
  type ReleaseDraftStructuredFieldValue,
} from "@/lib/release-draft-blocks"

type ReleaseDraftBlockEditorProps = {
  content: string
  contentFormat: "markdown" | "plain_text" | "tiptap_json"
  onChange: (value: ReleaseDraftStructuredFieldValue) => void
}

let nextEditorBlockId = 0

function createBlock(type: ReleaseDraftBlockType, text = ""): ReleaseDraftBlock {
  nextEditorBlockId += 1

  return {
    id: `${type}_${nextEditorBlockId}`,
    text,
    type,
  }
}

function getNextBlockType(type: ReleaseDraftBlockType): ReleaseDraftBlockType {
  return type === "bullet" ? "bullet" : "paragraph"
}

function getBlockAriaLabel(type: ReleaseDraftBlockType) {
  switch (type) {
    case "heading":
      return "Release draft heading block"
    case "bullet":
      return "Release draft bullet block"
    default:
      return "Release draft body block"
  }
}

export function ReleaseDraftBlockEditor({
  content,
  contentFormat,
  onChange,
}: ReleaseDraftBlockEditorProps) {
  const documentState = useMemo(
    () => getReleaseDraftBlockDocumentState(content, contentFormat),
    [content, contentFormat],
  )
  const normalizedBlocks = documentState.blocks
  const [blocks, setBlocks] = useState(normalizedBlocks)
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const lastStructuredContentRef = useRef(content)

  useEffect(() => {
    if (content === lastStructuredContentRef.current) {
      return
    }

    setBlocks(normalizedBlocks)
    lastStructuredContentRef.current = content
  }, [content, normalizedBlocks])

  useEffect(() => {
    if (!pendingFocusId) {
      return
    }

    const input = inputRefs.current[pendingFocusId]

    if (input) {
      input.focus()
    }

    setPendingFocusId(null)
  }, [pendingFocusId, blocks])

  function applyBlocks(nextBlocks: ReleaseDraftBlock[]) {
    const nextValue = buildReleaseDraftStructuredFieldValueFromBlocks(nextBlocks)

    setBlocks(nextBlocks)
    lastStructuredContentRef.current = nextValue.content
    onChange(nextValue)
  }

  function handleBlockChange(blockId: string, nextText: string) {
    applyBlocks(
      blocks.map((block) => (block.id === blockId ? { ...block, text: nextText } : block)),
    )
  }

  function insertBlockAfter(blockId: string, type: ReleaseDraftBlockType) {
    const index = blocks.findIndex((block) => block.id === blockId)
    const nextBlock = createBlock(type)
    const nextBlocks = [...blocks]

    nextBlocks.splice(index + 1, 0, nextBlock)
    applyBlocks(nextBlocks)
    setPendingFocusId(nextBlock.id)
  }

  function removeBlock(blockId: string) {
    if (blocks.length === 1) {
      return
    }

    const index = blocks.findIndex((block) => block.id === blockId)
    const fallbackBlock = blocks[index - 1] ?? blocks[index + 1] ?? null

    applyBlocks(blocks.filter((block) => block.id !== blockId))

    if (fallbackBlock) {
      setPendingFocusId(fallbackBlock.id)
    }
  }

  function applySlashCommand(blockId: string, type: ReleaseDraftBlockType) {
    applyBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              text: "",
              type,
            }
          : block,
      ),
    )
    setPendingFocusId(blockId)
  }

  if (!documentState.isEditable) {
    return (
      <div className="grid gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm text-amber-950 dark:text-amber-100">
          {documentState.notice}
        </p>
        <ReleaseDraftBlockRenderer
          content={content}
          contentFormat={contentFormat}
          showNotice={false}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {blocks.map((block) => {
        const commandQuery =
          focusedBlockId === block.id ? getReleaseDraftBlockCommandQuery(block.text) : null
        const matchingCommands = commandQuery !== null ? getReleaseDraftBlockCommands(commandQuery) : []
        const commandListId = commandQuery !== null ? `release-draft-slash-commands-${block.id}` : undefined

        return (
          <div
            key={block.id}
            className="relative grid gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="secondary">{getReleaseDraftDisplayLabel(block.type)}</Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => insertBlockAfter(block.id, getNextBlockType(block.type))}
              >
                Add block
              </Button>
            </div>
            <Textarea
              aria-describedby={commandListId}
              aria-label={getBlockAriaLabel(block.type)}
              ref={(node) => {
                inputRefs.current[block.id] = node
              }}
              className={
                block.type === "heading"
                  ? "min-h-[96px] resize-y border-0 bg-transparent px-0 py-0 text-xl font-semibold leading-8 shadow-none focus-visible:ring-0"
                  : "min-h-[120px] resize-y border-0 bg-transparent px-0 py-0 text-base leading-7 shadow-none focus-visible:ring-0"
              }
              placeholder={
                block.type === "heading"
                  ? "Write a release heading, or type / for block commands"
                  : block.type === "bullet"
                    ? "Write a bullet point, or type / for block commands"
                    : "Write the draft body, or type / for block commands"
              }
              value={block.text}
              onFocus={() => setFocusedBlockId(block.id)}
              onChange={(event) => handleBlockChange(block.id, event.target.value)}
              onKeyDown={(event) => {
                if (commandQuery !== null && matchingCommands.length > 0 && event.key === "Enter") {
                  event.preventDefault()
                  applySlashCommand(block.id, matchingCommands[0].type)
                  return
                }

                if (!event.shiftKey && event.key === "Enter") {
                  event.preventDefault()
                  insertBlockAfter(block.id, getNextBlockType(block.type))
                  return
                }

                if (event.key === "Backspace" && block.text.length === 0) {
                  event.preventDefault()
                  removeBlock(block.id)
                }
              }}
            />
            {commandQuery !== null ? (
              <div
                id={commandListId}
                className="rounded-2xl border border-border/70 bg-background p-3 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Slash commands
                </p>
                <div className="mt-3 grid gap-2">
                  {matchingCommands.length > 0 ? (
                    matchingCommands.map((command) => (
                      <button
                        key={command.type}
                        type="button"
                        className="grid gap-1 rounded-xl border border-border/60 px-3 py-2 text-left transition hover:border-foreground/20 hover:bg-muted/40"
                        onMouseDown={(event) => {
                          event.preventDefault()
                        }}
                        onClick={() => {
                          applySlashCommand(block.id, command.type)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            applySlashCommand(block.id, command.type)
                          }
                        }}
                      >
                        <span className="text-sm font-medium text-foreground">{command.label}</span>
                        <span className="text-xs text-muted-foreground">{command.description}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No matching commands. Try /text, /heading, or /bullet.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
