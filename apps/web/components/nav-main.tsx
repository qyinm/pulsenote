"use client"

import Link from "next/link"
import { PlusCircleIcon } from "lucide-react"

import { ReviewInboxButton } from "@/components/review-inbox-button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuBadge,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  inboxBadge,
  items,
}: {
  inboxBadge?: string | null
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
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New release"
              variant="outline"
              render={<Link href="/dashboard/release-context" />}
            >
              <PlusCircleIcon data-icon="inline-start" />
              <span>New release</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <ReviewInboxButton badge={inboxBadge} />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
          <SidebarMenuItem>
            <ReviewInboxButton compact badge={inboxBadge} />
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
