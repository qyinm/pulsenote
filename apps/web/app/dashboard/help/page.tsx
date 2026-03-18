import Link from "next/link"
import {
  CircleHelpIcon,
  FileStackIcon,
  LifeBuoyIcon,
  ShieldCheckIcon,
} from "lucide-react"

import {
  BulletList,
  DashboardPage,
  DashboardSplit,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { helpModules, knownIssues } from "@/lib/dashboard"

export default function HelpPage() {
  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Workflow guides"
          value={String(helpModules.length)}
          detail="Operational playbooks"
          description="Help content mirrors the real release workflow instead of expanding into generic AI help."
          badge="Guide"
          icon={CircleHelpIcon}
        />
        <MetricCard
          title="Known limits"
          value={String(knownIssues.length)}
          detail="Visible before misuse"
          description="Known limits are called out directly so teams do not confuse sample states with live output."
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Workflow coverage"
          value="4 steps"
          detail="Context to publish pack"
          description="The help center is organized by the same workflow users follow in the product."
          icon={FileStackIcon}
        />
        <MetricCard
          title="Support routing"
          value="15m"
          detail="Sample response target"
          description="Escalation guidance should move a blocked release forward quickly and clearly."
          icon={LifeBuoyIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {helpModules.map((module) => (
                <SurfaceCard
                  key={module.id}
                  title={module.title}
                  description={module.description}
                  action={<Badge variant="outline">{module.status}</Badge>}
                >
                  <Link
                    href={module.href}
                    className="inline-flex h-7 w-fit items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border px-2.5 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Open page
                  </Link>
                </SurfaceCard>
              ))}
            </div>

            <SurfaceCard
              title="Workflow guide"
              description="A calm operational checklist for teams publishing release communication under review."
            >
              <BulletList
                items={[
                  "Start with evidence and source freshness before drafting anything customer-facing.",
                  "Run claim check before approval so risky wording is corrected while context is still visible.",
                  "Keep approval notes explicit so the final export pack stays attributable and reviewable.",
                  "Export only after the publish asset, approval state, and evidence trail all agree.",
                ]}
              />
            </SurfaceCard>
          </>
        }
        aside={
          <div className="grid gap-4">
            {knownIssues.map((issue) => (
              <Alert key={issue.id} variant="destructive">
                <AlertTitle>{issue.title}</AlertTitle>
                <AlertDescription>{issue.description}</AlertDescription>
              </Alert>
            ))}
          </div>
        }
      />
    </DashboardPage>
  )
}
