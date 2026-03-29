import type { LucideIcon } from "lucide-react"
import {
  ArchiveIcon,
  CheckCheckIcon,
  CircleHelpIcon,
  FileStackIcon,
  FolderKanbanIcon,
  InboxIcon,
  PackageCheckIcon,
  SearchIcon,
  Settings2Icon,
  SquareChartGanttIcon,
  ShieldAlertIcon,
} from "lucide-react"

export type RouteGroup = "core" | "asset" | "utility"

export type RouteAction = {
  label: string
  href: string
  icon: LucideIcon
  variant?: "default" | "secondary" | "outline"
}

export type DashboardRoute = {
  href: string
  title: string
  sidebarTitle?: string
  description: string
  group: RouteGroup
  icon: LucideIcon
  badge?: string
  showInSidebar?: boolean
  primaryAction?: RouteAction
  secondaryAction?: RouteAction
}
export const dashboardRoutes: DashboardRoute[] = [
  {
    href: "/dashboard",
    title: "Release Dashboard",
    sidebarTitle: "Overview",
    description:
      "Track release context, claim checks, approvals, and publish packs from one operational surface.",
    group: "core",
    icon: SquareChartGanttIcon,
    primaryAction: {
      label: "Open approvals",
      href: "/dashboard/approval",
      icon: CheckCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Export pack",
      href: "/dashboard/publish-pack",
      icon: PackageCheckIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/inbox",
    title: "Inbox",
    description:
      "Review blocked claims, pending approvals, and workflow pressure from one release communication queue.",
    group: "core",
    icon: InboxIcon,
    showInSidebar: false,
    primaryAction: {
      label: "Open claim check",
      href: "/dashboard/claim-check",
      icon: ShieldAlertIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open approval",
      href: "/dashboard/approval",
      icon: CheckCheckIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/release-context",
    title: "Release Context",
    description:
      "Review intake coverage, evidence completeness, and source freshness before drafting starts.",
    group: "core",
    icon: FileStackIcon,
    primaryAction: {
      label: "Open claim checks",
      href: "/dashboard/claim-check",
      icon: ShieldAlertIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "View evidence",
      href: "/dashboard/evidence-library",
      icon: FolderKanbanIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/claim-check",
    title: "Claim Check",
    description:
      "See risky public language, missing evidence, and the next reviewer action before approval.",
    group: "core",
    icon: ShieldAlertIcon,
    primaryAction: {
      label: "Send to approval",
      href: "/dashboard/approval",
      icon: CheckCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Review log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/approval",
    title: "Approval",
    description:
      "Track who needs to sign off, what is blocking the queue, and how close each release is to publish-ready.",
    group: "core",
    icon: CheckCheckIcon,
    primaryAction: {
      label: "Prepare export",
      href: "/dashboard/publish-pack",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Decision log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/publish-pack",
    title: "Publish Pack",
    description:
      "Assemble channel-ready assets, export status, and the evidence summary required before publication.",
    group: "core",
    icon: PackageCheckIcon,
    primaryAction: {
      label: "Open export frames",
      href: "/dashboard/export-templates",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Evidence library",
      href: "/dashboard/evidence-library",
      icon: FolderKanbanIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/evidence-library",
    title: "Evidence Library",
    description:
      "Inspect synced sources, freshness risk, and which release records depend on each evidence block.",
    group: "asset",
    icon: FolderKanbanIcon,
    primaryAction: {
      label: "Open intake queue",
      href: "/dashboard/release-context",
      icon: FileStackIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Search workspace",
      href: "/dashboard/search",
      icon: SearchIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/review-log",
    title: "Review Log",
    description:
      "Follow every wording change, approval decision, and publish block in one chronological audit trail.",
    group: "asset",
    icon: ArchiveIcon,
    primaryAction: {
      label: "Back to approval",
      href: "/dashboard/approval",
      icon: CheckCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Get help",
      href: "/dashboard/help",
      icon: CircleHelpIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/export-templates",
    title: "Export Frames",
    description:
      "Inspect live export readiness and the evidence-backed handoff shape for each release record.",
    group: "asset",
    icon: PackageCheckIcon,
    primaryAction: {
      label: "Go to publish pack",
      href: "/dashboard/publish-pack",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open review log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/settings",
    title: "Settings",
    description:
      "Define review policy, notification defaults, and export rules for this release communication workspace.",
    group: "utility",
    icon: Settings2Icon,
    primaryAction: {
      label: "Open export frames",
      href: "/dashboard/export-templates",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Help center",
      href: "/dashboard/help",
      icon: CircleHelpIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/search",
    title: "Search",
    description:
      "Search release records, claims, evidence, approvals, history, and live review signals from one command-style workspace.",
    group: "utility",
    icon: SearchIcon,
    primaryAction: {
      label: "Open release context",
      href: "/dashboard/release-context",
      icon: FileStackIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Evidence library",
      href: "/dashboard/evidence-library",
      icon: FolderKanbanIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/help",
    title: "Help Center",
    sidebarTitle: "Get Help",
    description:
      "Follow the release workflow, see known limits, and route blocked questions to the right owner fast.",
    group: "utility",
    icon: CircleHelpIcon,
    primaryAction: {
      label: "Run claim check",
      href: "/dashboard/claim-check",
      icon: ShieldAlertIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open settings",
      href: "/dashboard/settings",
      icon: Settings2Icon,
      variant: "secondary",
    },
  },
]

export const coreRoutes = dashboardRoutes.filter(
  (route) => route.group === "core" && route.showInSidebar !== false
)
export const assetRoutes = dashboardRoutes.filter(
  (route) => route.group === "asset" && route.showInSidebar !== false
)
export const utilityRoutes = dashboardRoutes.filter(
  (route) => route.group === "utility" && route.showInSidebar !== false
)

export function getDashboardRoute(pathname: string | null | undefined) {
  return dashboardRoutes.find((route) => route.href === pathname) ?? dashboardRoutes[0] ?? null
}
