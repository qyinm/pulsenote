"use client"

import {
  BadgeCheckIcon,
  FileStackIcon,
  ShieldAlertIcon,
  StampIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const cards = [
  {
    title: "Release records",
    value: "12",
    meta: "4 updated today",
    note: "Three records still need new evidence links before review.",
    icon: <FileStackIcon data-icon="inline-start" />,
  },
  {
    title: "Draft readiness",
    value: "92%",
    meta: "Average source coverage",
    note: "Two customer-facing summaries still need exact scope wording.",
    icon: <StampIcon data-icon="inline-start" />,
  },
  {
    title: "Open claim checks",
    value: "3",
    meta: "1 high-priority warning",
    note: "Security and billing language still need explicit reviewer sign-off.",
    icon: <ShieldAlertIcon data-icon="inline-start" />,
  },
  {
    title: "Approvals pending",
    value: "2",
    meta: "ETA 18 min",
    note: "Publish pack can export after support and legal approvals land.",
    icon: <BadgeCheckIcon data-icon="inline-start" />,
  },
]

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="@container/card bg-linear-to-t from-primary/5 to-card shadow-xs"
        >
          <CardHeader>
            <CardDescription>{card.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">{card.meta}</Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex items-center gap-2 font-medium">
              {card.icon}
              {card.meta}
            </div>
            <div className="text-muted-foreground">{card.note}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
