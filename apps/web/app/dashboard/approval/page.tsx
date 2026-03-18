import {
  BadgeCheckIcon,
  Clock3Icon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react"

import { ApprovalStageTabs } from "@/components/dashboard/approval-stage-tabs"
import {
  BulletList,
  DashboardPage,
  DashboardSplit,
  InlineList,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { reviewLogEntries, approvalItems } from "@/lib/dashboard"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function ApprovalPage() {
  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Pending approvals"
          value={String(
            approvalItems.filter((item) => item.status === "Pending").length
          )}
          detail="2 records waiting"
          description="Pending stages are visible before they turn into publish-window delays."
          badge="Queue"
          icon={Clock3Icon}
        />
        <MetricCard
          title="In review"
          value={String(
            approvalItems.filter((item) => item.status === "In review").length
          )}
          detail="Active reviewer work"
          description="These records have an owner and a live note explaining the current review step."
          icon={UsersIcon}
        />
        <MetricCard
          title="Signed off"
          value={String(
            approvalItems.filter((item) => item.status === "Signed off").length
          )}
          detail="Approval complete"
          description="Signed-off items can move directly into publish-pack assembly."
          icon={BadgeCheckIcon}
        />
        <MetricCard
          title="Decision log"
          value="5"
          detail="Captured today"
          description="Every approval decision keeps a clear note so publish responsibility stays reviewable."
          icon={FileTextIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <>
            <SurfaceCard
              title="Approval stages"
              description="Follow the queue across content, support, legal, and final sign-off."
            >
              <ApprovalStageTabs />
            </SurfaceCard>

            <SurfaceCard
              title="Decision log preview"
              description="Recent approval-adjacent decisions that changed record state today."
            >
              <BulletList
                items={reviewLogEntries.slice(0, 4).map((entry) => {
                  return `${entry.timestamp}: ${entry.actor} ${entry.action.toLowerCase()} on ${entry.entity}. ${entry.note}`
                })}
              />
            </SurfaceCard>
          </>
        }
        aside={
          <>
            <SurfaceCard
              title="Approval focus"
              description="This is the current workload split across the approval pipeline."
            >
              <InlineList
                items={[
                  { label: "Content review", value: "1 in review" },
                  { label: "Support sign-off", value: "1 pending · 1 signed off" },
                  { label: "Legal review", value: "1 active blocker" },
                  { label: "Executive final", value: "1 waiting on scope" },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Approval note"
              description="Sample note template used when a reviewer opens a sign-off sheet."
              footer={
                <div className="flex w-full gap-2">
                  <Button variant="outline" size="sm">
                    Save note
                  </Button>
                  <Button variant="secondary" size="sm">
                    Request sign-off
                  </Button>
                </div>
              }
            >
              <Textarea
                defaultValue="Confirm the sentence is evidence-backed, scope is explicit, and any customer action matches support guidance."
              />
            </SurfaceCard>
          </>
        }
      />
    </DashboardPage>
  )
}
