import {
  LayoutTemplateIcon,
  MailIcon,
  PackageCheckIcon,
  ShapesIcon,
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
import { TemplateStatusBadge } from "@/components/dashboard/status-badges"
import { SimpleTable } from "@/components/dashboard/simple-table"
import { templateItems } from "@/lib/dashboard"

export default function ExportTemplatesPage() {
  const selected = templateItems[0]

  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Templates"
          value={String(templateItems.length)}
          detail="Channel-specific defaults"
          description="Templates keep export structure consistent without broadening the product beyond release communication."
          badge="Library"
          icon={LayoutTemplateIcon}
        />
        <MetricCard
          title="Needs review"
          value={String(
            templateItems.filter((item) => item.status !== "Current").length
          )}
          detail="Outdated export structure"
          description="Out-of-date templates are visible before they produce inconsistent publish packs."
          icon={PackageCheckIcon}
        />
        <MetricCard
          title="Email-ready"
          value="1"
          detail="Customer notice template"
          description="Email templates stay separate so customer timing and support CTA language stay exact."
          icon={MailIcon}
        />
        <MetricCard
          title="Channels covered"
          value="4"
          detail="Release note, email, status, changelog"
          description="Each channel keeps a dedicated export frame rather than a generic content shell."
          icon={ShapesIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {templateItems.map((item) => (
                <SurfaceCard
                  key={item.id}
                  title={item.name}
                  description={item.note}
                  action={<TemplateStatusBadge status={item.status} />}
                >
                  <InlineList
                    items={[
                      { label: "Channel", value: item.channel },
                      { label: "Audience", value: item.audience },
                      { label: "Owner", value: item.owner },
                      { label: "Updated", value: item.lastUpdated },
                    ]}
                  />
                </SurfaceCard>
              ))}
            </div>

            <SurfaceCard
              title="Template inventory"
              description="Review ownership and update dates before a template is used in the export path."
            >
              <SimpleTable
                columns={[
                  { key: "name", label: "Template" },
                  { key: "channel", label: "Channel" },
                  { key: "status", label: "Status" },
                  { key: "owner", label: "Owner" },
                  { key: "updated", label: "Last updated" },
                ]}
                rows={templateItems.map((item) => ({
                  key: item.id,
                  cells: {
                    name: item.name,
                    channel: item.channel,
                    status: <TemplateStatusBadge status={item.status} />,
                    owner: item.owner,
                    updated: item.lastUpdated,
                  },
                }))}
                emptyTitle="No export templates yet"
                emptyDescription="Add a channel template before exporting release communication."
              />
            </SurfaceCard>
          </>
        }
        aside={
          <SurfaceCard
            title="Selected template"
            description="Preview the current default structure for the highlighted channel."
          >
            <InlineList
              items={[
                { label: "Template", value: selected.name },
                { label: "Channel", value: selected.channel },
                { label: "Audience", value: selected.audience },
                { label: "Owner", value: selected.owner },
              ]}
            />
            <div className="mt-4">
              <BulletList
                items={[
                  "Lead with what changed and why it matters for the customer.",
                  "Follow with evidence-backed scope or rollout qualifiers.",
                  "Close with a concrete action or support path when needed.",
                ]}
              />
            </div>
          </SurfaceCard>
        }
      />
    </DashboardPage>
  )
}
