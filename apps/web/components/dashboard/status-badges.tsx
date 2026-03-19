import {
  Clock3Icon,
  PackageCheckIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type {
  ApprovalStatus,
  ClaimCheckSeverity,
  ClaimCheckState,
  EvidenceFreshness,
  PublishStatus,
  ReleaseStage,
  TemplateStatus,
} from "@/lib/dashboard"
import { Badge } from "@/components/ui/badge"

type BadgeVariant = "outline" | "secondary" | "destructive"

type BadgeConfig = {
  variant: BadgeVariant
  icon?: LucideIcon
}

function renderStatusBadge(label: string, config: BadgeConfig) {
  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      {Icon ? <Icon data-icon="inline-start" /> : null}
      {label}
    </Badge>
  )
}

export function ReleaseStageBadge({ status }: { status: ReleaseStage }) {
  if (status === "Ready to export") {
    return renderStatusBadge(status, {
      variant: "secondary",
      icon: PackageCheckIcon,
    })
  }

  return renderStatusBadge(status, { variant: "outline" })
}

export function ClaimCheckBadge({ state }: { state: ClaimCheckState }) {
  if (state === "Blocked") {
    return renderStatusBadge(state, { variant: "destructive", icon: ShieldAlertIcon })
  }

  if (state === "Watch") {
    return renderStatusBadge(state, { variant: "secondary", icon: Clock3Icon })
  }

  return renderStatusBadge(state, { variant: "outline", icon: ShieldCheckIcon })
}

export function ClaimSeverityBadge({
  severity,
}: {
  severity: ClaimCheckSeverity
}) {
  if (severity === "High") {
    return renderStatusBadge(severity, {
      variant: "destructive",
      icon: ShieldAlertIcon,
    })
  }

  if (severity === "Medium") {
    return renderStatusBadge(severity, { variant: "secondary", icon: Clock3Icon })
  }

  return renderStatusBadge(severity, { variant: "outline" })
}

export function ApprovalStatusBadge({
  status,
}: {
  status: ApprovalStatus
}) {
  if (status === "Signed off") {
    return renderStatusBadge(status, { variant: "outline", icon: ShieldCheckIcon })
  }

  if (status === "In review") {
    return renderStatusBadge(status, { variant: "secondary", icon: Clock3Icon })
  }

  return renderStatusBadge(status, { variant: "destructive", icon: ShieldAlertIcon })
}

export function PublishStatusBadge({ status }: { status: PublishStatus }) {
  if (status === "Ready") {
    return renderStatusBadge(status, { variant: "outline", icon: PackageCheckIcon })
  }

  if (status === "Needs work") {
    return renderStatusBadge(status, { variant: "secondary", icon: Clock3Icon })
  }

  return renderStatusBadge(status, { variant: "destructive", icon: ShieldAlertIcon })
}

export function EvidenceFreshnessBadge({
  freshness,
}: {
  freshness: EvidenceFreshness
}) {
  if (freshness === "Stale") {
    return renderStatusBadge(freshness, {
      variant: "destructive",
      icon: ShieldAlertIcon,
    })
  }

  if (freshness === "Watch") {
    return renderStatusBadge(freshness, {
      variant: "secondary",
      icon: Clock3Icon,
    })
  }

  return renderStatusBadge(freshness, { variant: "outline", icon: ShieldCheckIcon })
}

export function TemplateStatusBadge({
  status,
}: {
  status: TemplateStatus
}) {
  if (status === "Current") {
    return renderStatusBadge(status, { variant: "outline", icon: ShieldCheckIcon })
  }

  if (status === "Needs review") {
    return renderStatusBadge(status, { variant: "secondary", icon: Clock3Icon })
  }

  return renderStatusBadge(status, { variant: "destructive" })
}
