import {
  AlertTriangleIcon,
  FileSearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react"

import {
  BulletList,
  DashboardPage,
  DashboardSplit,
  InlineList,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import {
  ClaimSeverityBadge,
} from "@/components/dashboard/status-badges"
import { SimpleTable } from "@/components/dashboard/simple-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { claimCheckItems } from "@/lib/dashboard"

function evidenceBadge(state: (typeof claimCheckItems)[number]["evidenceState"]) {
  if (state === "Missing source") {
    return <Badge variant="destructive">{state}</Badge>
  }

  if (state === "Needs support") {
    return <Badge variant="secondary">{state}</Badge>
  }

  return <Badge variant="outline">{state}</Badge>
}

export default function ClaimCheckPage() {
  const claimStats = claimCheckItems.reduce(
    (stats, item) => {
      if (item.severity === "High") {
        stats.highSeverity += 1
      }

      if (item.evidenceState === "Verified") {
        stats.verified += 1
      } else {
        stats.needsSupport += 1
      }

      return stats
    },
    { highSeverity: 0, verified: 0, needsSupport: 0 }
  )

  return (
    <DashboardPage>
      <Alert variant="destructive">
        <AlertTitle>1 blocked claim still overstates rollout availability</AlertTitle>
        <AlertDescription>
          The SSO admin controls record should not move into approval until the legal
          note replaces the broad availability sentence with exact rollout scope.
        </AlertDescription>
      </Alert>

      <MetricGrid>
        <MetricCard
          title="Flagged claims"
          value={String(claimCheckItems.length)}
          detail="3 claims need wording changes"
          description="Every flagged line is still visible to reviewers with the next safe edit noted."
          badge="Queue"
          icon={ShieldAlertIcon}
        />
        <MetricCard
          title="High severity"
          value={String(claimStats.highSeverity)}
          detail="2 claims blocked"
          description="High-severity claims either overpromise availability or lack current proof."
          badge="Escalate"
          icon={AlertTriangleIcon}
        />
        <MetricCard
          title="Verified evidence"
          value={String(claimStats.verified)}
          detail="Still needs wording review"
          description="Evidence-backed claims still go through wording review before approval."
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Needs source support"
          value={String(claimStats.needsSupport)}
          detail="Open evidence questions"
          description="Missing or stale proof is surfaced here instead of being hidden in later review."
          icon={FileSearchIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <SurfaceCard
            title="Flagged claims"
            description="Review the exact sentence, severity, and reviewer action before anything moves into approval."
          >
            <SimpleTable
              columns={[
                { key: "release", label: "Release" },
                { key: "claim", label: "Customer-facing claim" },
                { key: "severity", label: "Severity" },
                { key: "evidence", label: "Evidence state" },
                { key: "reviewer", label: "Reviewer" },
              ]}
              rows={claimCheckItems.map((item) => ({
                key: item.id,
                cells: {
                  release: item.release,
                  claim: (
                    <div className="grid gap-1">
                      <span className="font-medium text-foreground">{item.claim}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.nextStep}
                      </span>
                    </div>
                  ),
                  severity: <ClaimSeverityBadge severity={item.severity} />,
                  evidence: evidenceBadge(item.evidenceState),
                  reviewer: item.reviewer,
                },
              }))}
              emptyTitle="No claims need review"
              emptyDescription="Claim warnings will appear here as new draft language is checked."
            />
          </SurfaceCard>
        }
        aside={
          <>
            <SurfaceCard
              title="Reviewer assignment"
              description="Claim ownership stays explicit, including who is responsible for the next safe wording pass."
            >
              <InlineList
                items={[
                  { label: "Grace Lee", value: "Legal + availability" },
                  { label: "Mina Park", value: "SDK rollout wording" },
                  { label: "Ivy Song", value: "Pricing scope verification" },
                  { label: "Chris Han", value: "Incident follow-up revision" },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Next safe wording moves"
              description="Use explicit edits instead of generic copy polish."
            >
              <BulletList
                items={[
                  "Replace blanket availability claims with phased rollout language tied to the exact cohort.",
                  "State what changed and who can use it now, rather than implying every customer has access.",
                  "If a customer action is required, confirm the support path before the sentence is approved.",
                ]}
              />
            </SurfaceCard>
          </>
        }
      />
    </DashboardPage>
  )
}
