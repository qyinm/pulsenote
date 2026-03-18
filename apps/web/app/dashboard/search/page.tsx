import {
  DatabaseZapIcon,
  SearchIcon,
  ShieldAlertIcon,
  TagsIcon,
} from "lucide-react"

import { SearchWorkspace } from "@/components/dashboard/search-workspace"
import {
  BulletList,
  DashboardPage,
  DashboardSplit,
  InlineList,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"

export default function SearchPage() {
  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Indexed entities"
          value="6"
          detail="Sample cross-workflow search"
          description="Search spans releases, claims, evidence, approvals, templates, and help content."
          badge="Command style"
          icon={SearchIcon}
        />
        <MetricCard
          title="Blocked entities"
          value="2"
          detail="Need immediate review"
          description="Search keeps blocked workflow state visible without navigating through every page."
          icon={ShieldAlertIcon}
        />
        <MetricCard
          title="Evidence tags"
          value="6"
          detail="Outcome-oriented labels"
          description="Tags make it easier to find source proof before a claim is published."
          icon={TagsIcon}
        />
        <MetricCard
          title="Reusable queries"
          value="5"
          detail="Operational shortcuts"
          description="Saved searches should help the team act faster, not hide important workflow context."
          icon={DatabaseZapIcon}
        />
      </MetricGrid>

      <DashboardSplit
        main={<SearchWorkspace />}
        aside={
          <>
            <SurfaceCard
              title="Recent searches"
              description="These sample queries mirror common release-ops checks."
            >
              <BulletList
                items={[
                  "blocked claim availability",
                  "support sign-off today",
                  "stale plan coverage evidence",
                  "email template review",
                ]}
              />
            </SurfaceCard>

            <SurfaceCard
              title="Search scope"
              description="Search is intentionally scoped to the release workflow, not broad content authoring."
            >
              <InlineList
                items={[
                  { label: "Includes", value: "Releases, claims, evidence, approvals" },
                  { label: "Excludes", value: "Generic content drafts and social planning" },
                  { label: "Result style", value: "Actionable records with route links" },
                ]}
              />
            </SurfaceCard>
          </>
        }
      />
    </DashboardPage>
  )
}
