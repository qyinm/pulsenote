"use client"

import Link from "next/link"
import { InboxIcon, PlusCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuBadge,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    href: string
    badge?: string
    isActive?: boolean
    icon?: React.ReactNode
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="New release"
              variant="outline"
              render={<Link href="/dashboard/release-context" />}
            >
              <PlusCircleIcon data-icon="inline-start" />
              <span>New release</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <InboxIcon />
              <span className="sr-only">Open review queue</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                render={<Link href={item.href} />}
                isActive={item.isActive}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
              {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
