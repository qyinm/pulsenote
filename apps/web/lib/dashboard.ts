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
      "Track releases as one board or list so every stage stays attached to a single record.",
    group: "core",
    icon: SquareChartGanttIcon,
    primaryAction: {
      label: "Open approval stage",
      href: "/dashboard/releases?focus=approval",
      icon: CheckCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open publish pack stage",
      href: "/dashboard/releases?focus=publish_pack",
      icon: PackageCheckIcon,
      variant: "secondary",
    },
    showInSidebar: false,
  },
  {
    href: "/dashboard/releases",
    title: "Releases",
    description:
      "Track every release record, its current workflow stage, reviewer handoff, and publish-pack readiness from one board or list.",
    group: "core",
    icon: SquareChartGanttIcon,
    primaryAction: {
      label: "New release",
      href: "/dashboard/new-release",
      icon: FileStackIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open inbox",
      href: "/dashboard/inbox",
      icon: InboxIcon,
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
      label: "Open blocked stage",
      href: "/dashboard/releases?focus=claim_check",
      icon: ShieldAlertIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open approval stage",
      href: "/dashboard/releases?focus=approval",
      icon: CheckCheckIcon,
      variant: "secondary",
    },
  },
  {
    href: "/dashboard/release-context",
    title: "Release Context",
    sidebarTitle: "New release",
    description:
      "Review intake coverage, evidence completeness, and source freshness before drafting starts.",
    group: "core",
    icon: FileStackIcon,
    primaryAction: {
      label: "Open releases",
      href: "/dashboard/releases",
      icon: SquareChartGanttIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Review log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
    showInSidebar: false,
  },
  {
    href: "/dashboard/new-release",
    title: "New release",
    description:
      "Choose a repository and confirm one release scope before PulseNote drafts, reviews, and exports it in one workflow.",
    group: "core",
    icon: FileStackIcon,
    showInSidebar: false,
    primaryAction: {
      label: "Open releases",
      href: "/dashboard/releases",
      icon: SquareChartGanttIcon,
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
    href: "/dashboard/claim-check",
    title: "Claim Check",
    description:
      "See risky public language, missing evidence, and the next reviewer action before approval.",
    group: "core",
    icon: ShieldAlertIcon,
    primaryAction: {
      label: "Open releases",
      href: "/dashboard/releases?focus=claim_check",
      icon: CheckCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Review log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
    showInSidebar: false,
  },
  {
    href: "/dashboard/approval",
    title: "Approval",
    description:
      "Track who needs to sign off, what is blocking the queue, and how close each release is to publish-ready.",
    group: "core",
    icon: CheckCheckIcon,
    primaryAction: {
      label: "Open releases",
      href: "/dashboard/releases?focus=approval",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Decision log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
    showInSidebar: false,
  },
  {
    href: "/dashboard/publish-pack",
    title: "Publish Pack",
    description:
      "Assemble channel-ready assets, export status, and the evidence summary required before publication.",
    group: "core",
    icon: PackageCheckIcon,
    primaryAction: {
      label: "Open releases",
      href: "/dashboard/releases?focus=publish_pack",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Review log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
    showInSidebar: false,
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
    showInSidebar: false,
  },
  {
    href: "/dashboard/review-log",
    title: "Review Log",
    description:
      "Follow every wording change, approval decision, and publish block in one chronological audit trail.",
    group: "core",
    icon: ArchiveIcon,
    primaryAction: {
      label: "Open releases",
      href: "/dashboard/releases",
      icon: SquareChartGanttIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "New release",
      href: "/dashboard/new-release",
      icon: FileStackIcon,
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
      label: "Open publish pack stage",
      href: "/dashboard/releases?focus=publish_pack",
      icon: PackageCheckIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open review log",
      href: "/dashboard/review-log",
      icon: ArchiveIcon,
      variant: "secondary",
    },
    showInSidebar: false,
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
      label: "New release",
      href: "/dashboard/new-release",
      icon: FileStackIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open releases",
      href: "/dashboard/releases",
      icon: SquareChartGanttIcon,
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
      label: "New release",
      href: "/dashboard/new-release",
      icon: FileStackIcon,
      variant: "outline",
    },
    secondaryAction: {
      label: "Open releases",
      href: "/dashboard/releases",
      icon: SquareChartGanttIcon,
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
