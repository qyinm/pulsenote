"use client"

import { Fragment, useEffect } from "react"

import { EditorContent, useEditor } from "@tiptap/react"

import { cn } from "@/lib/utils"
import {
  getReleaseDraftBlockDocumentState,
  releaseDraftTiptapExtensions,
  type ReleaseDraftBlockDocumentState,
} from "@/lib/release-draft-blocks"

type ReleaseDraftBlockRendererProps = {
  className?: string
  content: string
  contentFormat: "markdown" | "plain_text" | "tiptap_json"
  showNotice?: boolean
}

function getRendererClassName() {
  return cn(
    "tiptap prose prose-slate max-w-none text-foreground dark:prose-invert",
    "prose-p:my-0 prose-p:leading-7 prose-headings:mb-2 prose-headings:mt-6 prose-headings:font-semibold",
    "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-ul:my-0 prose-li:my-1",
  )
}

function ReleaseDraftBlockRendererContent({
  rendered,
}: {
  rendered: ReleaseDraftBlockDocumentState
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: releaseDraftTiptapExtensions,
    content: rendered.renderDocument,
    editorProps: {
      attributes: {
        class: getRendererClassName(),
      },
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.commands.setContent(rendered.renderDocument, { emitUpdate: false })
    editor.setEditable(false)
  }, [editor, rendered.renderDocument])

  if (!editor) {
    const sections: Array<
      | { type: "bullet-list"; blocks: ReleaseDraftBlockDocumentState["blocks"] }
      | { type: "block"; block: ReleaseDraftBlockDocumentState["blocks"][number] }
    > = []
    let bulletBuffer: ReleaseDraftBlockDocumentState["blocks"] = []

    const flushBulletBuffer = () => {
      if (bulletBuffer.length > 0) {
        sections.push({ type: "bullet-list", blocks: bulletBuffer })
        bulletBuffer = []
      }
    }

    for (const block of rendered.blocks) {
      if (block.type === "bullet") {
        bulletBuffer.push(block)
        continue
      }

      flushBulletBuffer()
      sections.push({ type: "block", block })
    }

    flushBulletBuffer()

    return (
      <div className={getRendererClassName()}>
        {sections.map((section, index) => {
          if (section.type === "bullet-list") {
            return (
              <ul key={`bullets-${index}`}>
                {section.blocks.map((block) => (
                  <li key={block.id}>
                    <p>{block.text}</p>
                  </li>
                ))}
              </ul>
            )
          }

          if (section.block.type === "heading") {
            return <h2 key={section.block.id}>{section.block.text}</h2>
          }

          return (
            <Fragment key={section.block.id}>
              <p>{section.block.text}</p>
            </Fragment>
          )
        })}
      </div>
    )
  }

  return <EditorContent editor={editor} />
}

export function ReleaseDraftBlockRenderer({
  className,
  content,
  contentFormat,
  showNotice = true,
}: ReleaseDraftBlockRendererProps) {
  const rendered = getReleaseDraftBlockDocumentState(content, contentFormat)

  return (
    <div className={cn("grid gap-4", className)}>
      {showNotice && rendered.notice ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          {rendered.notice}
        </p>
      ) : null}
      <ReleaseDraftBlockRendererContent rendered={rendered} />
    </div>
  )
}
