import { Clock3Icon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

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

export function EvidenceFreshnessBadge({
  freshness,
}: {
  freshness: "Fresh" | "Watch" | "Stale"
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
