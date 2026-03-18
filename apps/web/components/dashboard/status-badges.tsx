import {
  Clock3Icon,
  PackageCheckIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react"

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

export function ReleaseStageBadge({ status }: { status: ReleaseStage }) {
  if (status === "Ready to export") {
    return (
      <Badge variant="secondary">
        <PackageCheckIcon data-icon="inline-start" />
        {status}
      </Badge>
    )
  }

  return <Badge variant="outline">{status}</Badge>
}

export function ClaimCheckBadge({ state }: { state: ClaimCheckState }) {
  if (state === "Blocked") {
    return (
      <Badge variant="destructive">
        <ShieldAlertIcon data-icon="inline-start" />
        {state}
      </Badge>
    )
  }

  if (state === "Watch") {
    return (
      <Badge variant="secondary">
        <Clock3Icon data-icon="inline-start" />
        {state}
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      <ShieldCheckIcon data-icon="inline-start" />
      {state}
    </Badge>
  )
}

export function ClaimSeverityBadge({
  severity,
}: {
  severity: ClaimCheckSeverity
}) {
  if (severity === "High") {
    return (
      <Badge variant="destructive">
        <ShieldAlertIcon data-icon="inline-start" />
        {severity}
      </Badge>
    )
  }

  if (severity === "Medium") {
    return (
      <Badge variant="secondary">
        <Clock3Icon data-icon="inline-start" />
        {severity}
      </Badge>
    )
  }

  return <Badge variant="outline">{severity}</Badge>
}

export function ApprovalStatusBadge({
  status,
}: {
  status: ApprovalStatus
}) {
  if (status === "Signed off") {
    return (
      <Badge variant="outline">
        <ShieldCheckIcon data-icon="inline-start" />
        {status}
      </Badge>
    )
  }

  if (status === "In review") {
    return (
      <Badge variant="secondary">
        <Clock3Icon data-icon="inline-start" />
        {status}
      </Badge>
    )
  }

  return (
    <Badge variant="destructive">
      <ShieldAlertIcon data-icon="inline-start" />
      {status}
    </Badge>
  )
}

export function PublishStatusBadge({ status }: { status: PublishStatus }) {
  if (status === "Ready") {
    return (
      <Badge variant="outline">
        <PackageCheckIcon data-icon="inline-start" />
        {status}
      </Badge>
    )
  }

  if (status === "Needs work") {
    return (
      <Badge variant="secondary">
        <Clock3Icon data-icon="inline-start" />
        {status}
      </Badge>
    )
  }

  return (
    <Badge variant="destructive">
      <ShieldAlertIcon data-icon="inline-start" />
      {status}
    </Badge>
  )
}

export function EvidenceFreshnessBadge({
  freshness,
}: {
  freshness: EvidenceFreshness
}) {
  if (freshness === "Stale") {
    return (
      <Badge variant="destructive">
        <ShieldAlertIcon data-icon="inline-start" />
        {freshness}
      </Badge>
    )
  }

  if (freshness === "Watch") {
    return (
      <Badge variant="secondary">
        <Clock3Icon data-icon="inline-start" />
        {freshness}
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      <ShieldCheckIcon data-icon="inline-start" />
      {freshness}
    </Badge>
  )
}

export function TemplateStatusBadge({
  status,
}: {
  status: TemplateStatus
}) {
  if (status === "Current") {
    return (
      <Badge variant="outline">
        <ShieldCheckIcon data-icon="inline-start" />
        {status}
      </Badge>
    )
  }

  if (status === "Needs review") {
    return (
      <Badge variant="secondary">
        <Clock3Icon data-icon="inline-start" />
        {status}
      </Badge>
    )
  }

  return <Badge variant="destructive">{status}</Badge>
}
