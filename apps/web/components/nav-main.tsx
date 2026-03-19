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
              className="min-w-0 flex-1"
              render={<Link href="/dashboard/release-context" />}
            >
              <PlusCircleIcon data-icon="inline-start" />
              <span>New release</span>
            </SidebarMenuButton>
            <ReviewInboxButton />
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
