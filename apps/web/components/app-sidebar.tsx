"use client"

import * as React from "react"
import Link from "next/link"
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

function PulseNoteMark(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 320 320" fill="none" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M226.708 21.6456C234.118 25.4876 237.122 34.8312 233.416 42.5152L191.186 130.102C187.985 136.741 192.823 144.445 200.194 144.445H280C280 144.445 284.55 144.444 285 144.444C293.284 144.444 300 151.408 300 159.999C300 168.59 293.284 175.554 285 175.554C208.93 175.554 146.578 222.62 113.417 291.398C109.712 299.082 100.701 302.196 93.2918 298.354C85.8822 294.512 82.8788 285.168 86.5836 277.484L128.816 189.893C132.017 183.255 127.181 175.553 119.812 175.552C91.5412 175.548 63.2704 175.556 35 175.556C26.7158 175.556 20 168.592 20 160.001C20 151.41 26.7158 144.446 35 144.446C111.072 144.446 173.423 97.377 206.584 28.6006C210.29 20.9176 219.3 17.8039 226.708 21.6456Z"
      />
    </svg>
  )
}

type SidebarUser = {
  avatar?: string
  email: string
  name: string
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: SidebarUser | null
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="PulseNote"
              aria-label="PulseNote"
              render={<Link href="/dashboard" />}
              className="data-[slot=sidebar-menu-button]:p-2 group-data-[collapsible=icon]:justify-center"
            >
              <PulseNoteMark className="size-4 shrink-0" />
              <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">
                PulseNote
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={coreRoutes.map((route) => ({
            title: route.sidebarTitle ?? route.title,
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
            title: route.sidebarTitle ?? route.title,
            href: route.href,
            badge: route.badge,
            isActive: pathname === route.href,
            icon: <route.icon />,
          }))}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
