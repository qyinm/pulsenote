import Link from "next/link"
import type { ReactNode } from "react"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

import { type EmailAuthMode, getEmailAuthContent } from "@/lib/auth/email-auth"

type EmailAuthShellProps = {
  children?: ReactNode
  mode: EmailAuthMode
}

export function EmailAuthShell({ children, mode }: EmailAuthShellProps) {
  const content = getEmailAuthContent(mode)

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="space-y-2">
          <div className="text-xl font-semibold tracking-tight">{content.title}</div>
          <p className="text-sm text-muted-foreground">{content.description}</p>
        </div>

        <div className="mt-6">{children}</div>

        <div className="mt-4 text-sm text-muted-foreground">
          <Link
            href={content.alternateHref}
            className={cn(buttonVariants({ variant: "link" }), "h-auto px-0")}
          >
            {content.alternateLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
