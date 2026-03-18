import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value = 0,
  max = 100,
  ...props
}: React.ComponentProps<"div"> & {
  value?: number
  max?: number
}) {
  const normalized = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${normalized}%` }}
      />
    </div>
  )
}

export { Progress }
