import {
  ArchiveIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TimerResetIcon,
} from "lucide-react"

import {
  DashboardPage,
  MetricCard,
  MetricGrid,
} from "@/components/dashboard/surfaces"
import { ReviewLogWorkspace } from "@/components/dashboard/review-log-workspace"
import { reviewLogEntries } from "@/lib/dashboard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ReviewLogPage() {
  return (
    <DashboardPage>
      <Alert>
        <AlertTitle>Decision history should stay reviewable end to end</AlertTitle>
        <AlertDescription>
          Every blocked state, wording revision, and sign-off remains visible here so
          the final publish pack can be audited without reconstructing context from chat.
        </AlertDescription>
      </Alert>

      <MetricGrid>
        <MetricCard
          title="Decisions today"
          value={String(reviewLogEntries.length)}
          detail="Visible audit trail"
          description="Every review action remains visible so wording changes stay accountable."
          badge="Today"
          icon={ArchiveIcon}
        />
        <MetricCard
          title="Reopened items"
          value="1"
          detail="Needs another pass"
          description="Reopened records stay explicit instead of silently disappearing from the queue."
          icon={RotateCcwIcon}
        />
        <MetricCard
          title="Signed off"
          value="2"
          detail="Cleared for next step"
          description="Signed-off decisions keep their timestamp and reviewer context intact for later export."
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Average resolution"
          value="26m"
          detail="From warning to update"
          description="Operational timing helps the team spot where review friction is accumulating."
          icon={TimerResetIcon}
        />
      </MetricGrid>

      <ReviewLogWorkspace />
    </DashboardPage>
  )
}
