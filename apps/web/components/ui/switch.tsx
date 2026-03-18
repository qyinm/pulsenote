"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-input/80 p-0.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[checked]:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="size-5 rounded-full bg-background shadow-sm transition-transform duration-200 data-[checked]:translate-x-5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
