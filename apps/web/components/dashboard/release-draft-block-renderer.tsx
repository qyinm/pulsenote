import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  type ReleaseDraftBlock,
  parseReleaseDraftBlocks,
} from "@/lib/release-draft-blocks"

type ReleaseDraftBlockRendererProps = {
  className?: string
  content: string
  contentFormat: "markdown" | "plain_text" | "tiptap_json"
}

function renderBlocks(blocks: ReleaseDraftBlock[]) {
  const output: ReactNode[] = []
  let bulletBuffer: ReleaseDraftBlock[] = []

  function flushBulletBuffer() {
    if (bulletBuffer.length === 0) {
      return
    }

    output.push(
      <ul key={`bullet_group_${output.length}`} className="ml-5 list-disc space-y-2 text-base leading-7">
        {bulletBuffer.map((block) => (
          <li key={block.id} className="text-foreground">
            {block.text}
          </li>
        ))}
      </ul>,
    )
    bulletBuffer = []
  }

  for (const block of blocks) {
    if (block.type === "bullet") {
      bulletBuffer.push(block)
      continue
    }

    flushBulletBuffer()

    if (block.type === "heading") {
      output.push(
        <h3 key={block.id} className="text-lg font-semibold tracking-tight text-foreground">
          {block.text}
        </h3>,
      )
      continue
    }

    output.push(
      <p key={block.id} className="whitespace-pre-wrap text-base leading-7 text-foreground [overflow-wrap:anywhere]">
        {block.text}
      </p>,
    )
  }

  flushBulletBuffer()

  return output.length > 0 ? output : [<p key="empty" className="text-base leading-7 text-muted-foreground">No draft content yet.</p>]
}

export function ReleaseDraftBlockRenderer({
  className,
  content,
  contentFormat,
}: ReleaseDraftBlockRendererProps) {
  const blocks = parseReleaseDraftBlocks(content, contentFormat)

  return <div className={cn("grid gap-4", className)}>{renderBlocks(blocks)}</div>
}
