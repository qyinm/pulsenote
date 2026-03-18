"use client"

import * as React from "react"
import Link from "next/link"
import { CommandIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { assetRoutes, coreRoutes, utilityRoutes } from "@/lib/dashboard"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              className="data-[slot=sidebar-menu-button]:p-2"
            >
              <CommandIcon />
              <span className="text-base font-semibold">PulseNote</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={coreRoutes.map((route) => ({
            title: route.title.replace("Release Dashboard", "Overview"),
            href: route.href,
            badge: route.badge,
            isActive: pathname === route.href,
            icon: <route.icon />,
          }))}
        />
        <NavDocuments
          items={assetRoutes.map((route) => ({
            title: route.title,
            href: route.href,
            badge: route.badge,
            isActive: pathname === route.href,
            icon: <route.icon />,
          }))}
        />
        <NavSecondary
          items={utilityRoutes.map((route) => ({
            title: route.title.replace("Help Center", "Get Help"),
            href: route.href,
            badge: route.badge,
            isActive: pathname === route.href,
            icon: <route.icon />,
          }))}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: "Release Ops",
            email: "ops@pulsenote.app",
            avatar: "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
