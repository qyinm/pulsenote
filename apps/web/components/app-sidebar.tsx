"use client"

import * as React from "react"
import {
  ArchiveIcon,
  CheckCheckIcon,
  CommandIcon,
  FileStackIcon,
  FolderKanbanIcon,
  PackageCheckIcon,
  SearchIcon,
  Settings2Icon,
  ShieldAlertIcon,
  SquareChartGanttIcon,
  CircleHelpIcon,
} from "lucide-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Release Ops",
    email: "ops@pulsenote.app",
    avatar: "",
  },
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      isActive: true,
      icon: <SquareChartGanttIcon />,
    },
    {
      title: "Release Context",
      url: "#release-context",
      icon: <FileStackIcon />,
    },
    {
      title: "Claim Check",
      url: "#claim-check",
      icon: <ShieldAlertIcon />,
    },
    {
      title: "Approval",
      url: "#approval",
      icon: <CheckCheckIcon />,
    },
    {
      title: "Publish Pack",
      url: "#publish-pack",
      icon: <PackageCheckIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#settings",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#help",
      icon: <CircleHelpIcon />,
    },
    {
      title: "Search",
      url: "#search",
      icon: <SearchIcon />,
    },
  ],
  documents: [
    {
      name: "Evidence Library",
      url: "#evidence-library",
      icon: <FolderKanbanIcon />,
    },
    {
      name: "Review Log",
      url: "#review-log",
      icon: <ArchiveIcon />,
    },
    {
      name: "Export Templates",
      url: "#export-templates",
      icon: <PackageCheckIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<a href="/dashboard" />}
              className="data-[slot=sidebar-menu-button]:p-2"
            >
              <CommandIcon />
              <span className="text-base font-semibold">PulseNote</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
