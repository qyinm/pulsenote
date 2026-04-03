"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { Editor as TiptapEditor } from "@tiptap/core"
import Placeholder from "@tiptap/extension-placeholder"
import { EditorContent, useEditor } from "@tiptap/react"

import { ReleaseDraftBlockRenderer } from "@/components/dashboard/release-draft-block-renderer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  buildReleaseDraftStructuredFieldValueFromDocument,
  getReleaseDraftBlockCommands,
  getReleaseDraftBlockDocumentState,
  releaseDraftTiptapExtensions,
  type ReleaseDraftBlockType,
  type ReleaseDraftStructuredFieldValue,
} from "@/lib/release-draft-blocks"

type ReleaseDraftBlockEditorProps = {
  content: string
  contentFormat: "markdown" | "plain_text" | "tiptap_json"
  fieldLabel?: string
  onChange: (value: ReleaseDraftStructuredFieldValue) => void
}

type SlashMenuState = {
  query: string
  range: {
    from: number
    to: number
  }
}

function getEditorPlaceholder(fieldLabel?: string) {
  const normalized = fieldLabel?.trim()

  if (!normalized) {
    return "Write the draft content, or type / for block commands"
  }

  return `Write ${normalized.toLowerCase()}, or type / for block commands`
}

function getSlashMenuState(editor: TiptapEditor): SlashMenuState | null {
  const { from, empty } = editor.state.selection

  if (!empty) {
    return null
  }

  const { $from } = editor.state.selection
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc")
  const slashMatch = textBefore.match(/(?:^|\s)\/([a-z-]*)$/i)

  if (!slashMatch) {
    return null
  }

  const slashIndex = textBefore.lastIndexOf(`/${slashMatch[1] ?? ""}`)

  if (slashIndex < 0) {
    return null
  }

  return {
    query: (slashMatch[1] ?? "").toLowerCase(),
    range: {
      from: from - (textBefore.length - slashIndex),
      to: from,
    },
  }
}

function applySlashCommand(
  editor: TiptapEditor,
  slashMenuState: SlashMenuState,
  type: ReleaseDraftBlockType,
) {
  const chain = editor.chain().focus().deleteRange(slashMenuState.range)

  if (type === "heading") {
    chain.setNode("heading", { level: 2 }).run()
    return
  }

  if (type === "bullet") {
    chain.toggleBulletList().run()
    return
  }

  chain.setParagraph().run()
}

export function ReleaseDraftBlockEditor({
  content,
  contentFormat,
  fieldLabel,
  onChange,
}: ReleaseDraftBlockEditorProps) {
  const documentState = useMemo(
    () => getReleaseDraftBlockDocumentState(content, contentFormat),
    [content, contentFormat],
  )
  const [slashMenuState, setSlashMenuState] = useState<SlashMenuState | null>(null)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const lastStructuredValueRef = useRef({
    content,
    contentFormat,
  })
  const slashMenuStateRef = useRef<SlashMenuState | null>(null)
  const selectedCommandIndexRef = useRef(0)
  const matchingCommands = useMemo(
    () => getReleaseDraftBlockCommands(slashMenuState?.query),
    [slashMenuState?.query],
  )
  const matchingCommandsRef = useRef(matchingCommands)
  const placeholder = getEditorPlaceholder(fieldLabel)

  useEffect(() => {
    slashMenuStateRef.current = slashMenuState
    matchingCommandsRef.current = matchingCommands
    selectedCommandIndexRef.current = selectedCommandIndex
  }, [matchingCommands, selectedCommandIndex, slashMenuState])

  useEffect(() => {
    setSelectedCommandIndex(0)
  }, [slashMenuState?.query])

  const editor = useEditor({
    immediatelyRender: false,
    editable: documentState.isEditable,
    editorProps: {
      attributes: {
        "aria-label": fieldLabel ? `${fieldLabel} editor` : "Release draft editor",
        class:
          "min-h-[240px] rounded-2xl border border-border/70 bg-background px-4 py-3 text-base leading-7 text-foreground outline-none transition-colors focus-within:border-ring",
      },
      handleKeyDown: (view, event) => {
        const currentSlashState = slashMenuStateRef.current
        const currentCommands = matchingCommandsRef.current

        if (!currentSlashState || currentCommands.length === 0) {
          return false
        }

        if (event.key === "ArrowDown") {
          event.preventDefault()
          setSelectedCommandIndex((current) => (current + 1) % currentCommands.length)
          return true
        }

        if (event.key === "ArrowUp") {
          event.preventDefault()
          setSelectedCommandIndex((current) =>
            current === 0 ? currentCommands.length - 1 : current - 1,
          )
          return true
        }

        if (event.key === "Enter") {
          event.preventDefault()
          const editorFromView = (view as typeof view & { editor?: TiptapEditor }).editor

          if (!editorFromView) {
            return false
          }

          applySlashCommand(
            editorFromView,
            currentSlashState,
            currentCommands[selectedCommandIndexRef.current]?.type ?? "paragraph",
          )
          return true
        }

        if (event.key === "Escape") {
          event.preventDefault()
          setSlashMenuState(null)
          return true
        }

        return false
      },
    },
    extensions: [
      ...releaseDraftTiptapExtensions,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: documentState.document,
    onCreate({ editor }) {
      setSlashMenuState(getSlashMenuState(editor))
    },
    onSelectionUpdate({ editor }) {
      setSlashMenuState(getSlashMenuState(editor))
    },
    onUpdate({ editor }) {
      setSlashMenuState(getSlashMenuState(editor))
      const nextValue = buildReleaseDraftStructuredFieldValueFromDocument(editor.getJSON())
      lastStructuredValueRef.current = {
        content: nextValue.content,
        contentFormat: nextValue.contentFormat,
      }
      onChange(nextValue)
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    if (
      content === lastStructuredValueRef.current.content &&
      contentFormat === lastStructuredValueRef.current.contentFormat
    ) {
      return
    }

    editor.commands.setContent(documentState.document, { emitUpdate: false })
    editor.setEditable(documentState.isEditable)
    setSlashMenuState(getSlashMenuState(editor))
    lastStructuredValueRef.current = {
      content,
      contentFormat,
    }
  }, [content, contentFormat, documentState.document, documentState.isEditable, editor])

  if (!documentState.isEditable) {
    return (
      <div className="grid gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm text-amber-950 dark:text-amber-100">{documentState.notice}</p>
        <ReleaseDraftBlockRenderer
          content={content}
          contentFormat={contentFormat}
          showNotice={false}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Tiptap</Badge>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!editor) {
              return
            }

            editor.chain().focus().setParagraph().run()
          }}
        >
          Text
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!editor) {
              return
            }

            editor.chain().focus().setNode("heading", { level: 2 }).run()
          }}
        >
          Heading
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!editor) {
              return
            }

            editor.chain().focus().toggleBulletList().run()
          }}
        >
          Bullet list
        </Button>
      </div>
      <div className="grid gap-3">
        <EditorContent editor={editor} />
        {slashMenuState ? (
          <div
            aria-label="Slash commands"
            className="rounded-2xl border border-border/70 bg-background p-3 shadow-sm"
            role="listbox"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Slash commands
            </p>
            <div className="mt-3 grid gap-2">
              {matchingCommands.length > 0 ? (
                matchingCommands.map((command, index) => (
                  <button
                    key={command.type}
                    aria-selected={selectedCommandIndex === index}
                    className="grid gap-1 rounded-xl border border-border/60 px-3 py-2 text-left transition hover:border-foreground/20 hover:bg-muted/40 aria-selected:border-foreground/20 aria-selected:bg-muted/40"
                    onMouseDown={(event) => {
                      event.preventDefault()
                    }}
                    onClick={() => {
                      if (!editor) {
                        return
                      }

                      applySlashCommand(editor, slashMenuState, command.type)
                    }}
                    role="option"
                    type="button"
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
    </div>
  )
}
