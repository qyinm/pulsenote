"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  BellIcon,
  CircleUserRoundIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
  PackageCheckIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient, type AuthClientType } from "@/lib/auth/client"

type NavUserData = {
  avatar?: string
  email: string
  name: string
}

type SignOutPayload = Parameters<AuthClientType["signOut"]>[0]
type SignOutResult = Awaited<ReturnType<AuthClientType["signOut"]>> & {
  error?: {
    message?: string | null
  } | null
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return "U"
  }

  return parts
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getSignOutPayload(): SignOutPayload {
  return {
    fetchOptions: {
      onSuccess: () => undefined,
    },
  } as SignOutPayload
}

function getSignOutErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Sign out failed. Try again."
}

export function NavUser({ user }: { user?: NavUserData | null }) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const profile = user ?? {
    email: "No active session",
    name: "Signed out",
  }
  const initials = getInitials(profile.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={profile.avatar} alt={profile.name} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{profile.name}</span>
              <span className="truncate text-xs text-foreground/70">
                {profile.email}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{profile.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {profile.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                <CircleUserRoundIcon />
                Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/inbox")}>
                <BellIcon />
                Approval alerts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/review-log")}>
                <PackageCheckIcon />
                Export history
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {errorMessage ? (
              <>
                <DropdownMenuLabel className="px-1.5 py-1 text-xs text-destructive">
                  {errorMessage}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending || !user}
              onClick={() => {
                if (!user) {
                  return
                }

                setErrorMessage(null)
                startTransition(async () => {
                  try {
                    const result = (await authClient.signOut(
                      getSignOutPayload(),
                    )) as SignOutResult

                    if (result?.error) {
                      throw new Error(result.error.message?.trim() || "Sign out failed")
                    }

                    router.push("/auth/sign-in")
                    router.refresh()
                  } catch (error) {
                    setErrorMessage(getSignOutErrorMessage(error))
                  }
                })
              }}
            >
              <LogOutIcon />
              {isPending ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
