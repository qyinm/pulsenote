"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { releaseTrendData } from "@/lib/dashboard"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const chartConfig = {
  drafts: {
    label: "Draft-ready records",
    color: "var(--chart-1)",
  },
  warnings: {
    label: "Open claim warnings",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("12w")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("4w")
    }
  }, [isMobile])

  const filteredData = releaseTrendData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date()
    let daysToSubtract = 84

    if (timeRange === "4w") {
      daysToSubtract = 28
    } else if (timeRange === "2w") {
      daysToSubtract = 14
    }

    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)

    return date >= startDate
  })

  return (
    <Card className="@container/card shadow-xs">
      <CardHeader>
        <CardTitle>Draft readiness vs claim warnings</CardTitle>
        <CardDescription>
          Release communication signal over the last 12 weeks.
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? "12w")
            }}
            variant="outline"
            className="hidden @[767px]/card:flex"
          >
            <ToggleGroupItem value="12w">Last 12 weeks</ToggleGroupItem>
            <ToggleGroupItem value="4w">Last 4 weeks</ToggleGroupItem>
            <ToggleGroupItem value="2w">Last 2 weeks</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setTimeRange(value)
              }
            }}
            items={[
              { label: "Last 12 weeks", value: "12w" },
              { label: "Last 4 weeks", value: "4w" },
              { label: "Last 2 weeks", value: "2w" },
            ]}
          >
            <SelectTrigger
              className="flex w-40 @[767px]/card:hidden"
              size="sm"
              aria-label="Select a time range"
            >
              <SelectValue placeholder="Last 12 weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="12w">Last 12 weeks</SelectItem>
                <SelectItem value="4w">Last 4 weeks</SelectItem>
                <SelectItem value="2w">Last 2 weeks</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDrafts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-drafts)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-drafts)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fillWarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-warnings)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--color-warnings)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value) => {
                const date = new Date(value)

                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="drafts"
              type="monotone"
              fill="url(#fillDrafts)"
              stroke="var(--color-drafts)"
              strokeWidth={2}
            />
            <Area
              dataKey="warnings"
              type="monotone"
              fill="url(#fillWarnings)"
              stroke="var(--color-warnings)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
