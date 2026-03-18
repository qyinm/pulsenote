import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function DashboardPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("@container/main flex flex-1 flex-col gap-4 p-4 md:p-6", className)}>
      {children}
    </div>
  )
}

export function DashboardSplit({
  main,
  aside,
}: {
  main: ReactNode
  aside?: ReactNode
}) {
  if (!aside) {
    return <div className="grid gap-4">{main}</div>
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)]">
      <div className="grid gap-4">{main}</div>
      <aside className="grid gap-4">{aside}</aside>
    </div>
  )
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {children}
    </div>
  )
}

export function MetricCard({
  title,
  value,
  detail,
  description,
  badge,
  icon: Icon,
}: {
  title: string
  value: string
  detail: string
  description: string
  badge?: string
  icon: LucideIcon
}) {
  return (
    <Card className="bg-linear-to-b from-card to-muted/40 shadow-xs">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {value}
        </CardTitle>
        <CardAction>{badge ? <Badge variant="outline">{badge}</Badge> : null}</CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Icon data-icon="inline-start" />
          {detail}
        </div>
        <p className="text-muted-foreground">{description}</p>
      </CardFooter>
    </Card>
  )
}

export function SurfaceCard({
  title,
  description,
  action,
  footer,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  )
}

export function InlineList({
  items,
}: {
  items: {
    label: string
    value: ReactNode
  }[]
}) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
        >
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <div className="text-right text-sm font-medium text-foreground">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item} className="flex gap-3 text-sm">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-foreground/70" />
          <p className="text-muted-foreground">{item}</p>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
