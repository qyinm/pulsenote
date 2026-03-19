"use client"

import { approvalItems, type ApprovalItem } from "@/lib/dashboard"
import { ApprovalStatusBadge } from "@/components/dashboard/status-badges"
import { SimpleTable } from "@/components/dashboard/simple-table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const stages = [
  "Content review",
  "Support sign-off",
  "Legal review",
  "Executive final",
] as const

const approvalRowsByStage = approvalItems.reduce(
  (rows, item) => {
    rows[item.stage].push({
      key: item.id,
      cells: {
        release: item.release,
        status: <ApprovalStatusBadge status={item.status} />,
        owner: item.owner,
        dueAt: item.dueAt,
        note: <span className="text-muted-foreground">{item.note}</span>,
      },
    })

    return rows
  },
  {
    "Content review": [],
    "Support sign-off": [],
    "Legal review": [],
    "Executive final": [],
  } as Record<ApprovalItem["stage"], ReturnType<typeof rowsForStage>>
)

function rowsForStage(stage: ApprovalItem["stage"]) {
  return approvalRowsByStage[stage]
}

export function ApprovalStageTabs() {
  return (
    <Tabs defaultValue={stages[0]} className="gap-4">
      <TabsList variant="line" className="w-full flex-wrap justify-start">
        {stages.map((stage) => {
          const count = approvalRowsByStage[stage].length

          return (
            <TabsTrigger key={stage} value={stage}>
              {stage}
              <Badge variant="secondary">{count}</Badge>
            </TabsTrigger>
          )
        })}
      </TabsList>
      {stages.map((stage) => (
        <TabsContent key={stage} value={stage}>
          <SimpleTable
            columns={[
              { key: "release", label: "Release" },
              { key: "status", label: "Status" },
              { key: "owner", label: "Owner" },
              { key: "dueAt", label: "Due" },
              { key: "note", label: "Latest note" },
            ]}
            rows={rowsForStage(stage)}
            emptyTitle="No approvals in this stage"
            emptyDescription="New approvals will appear here as the release queue advances."
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
