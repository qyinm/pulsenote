import {
  LayoutTemplateIcon,
  MailIcon,
  PackageCheckIcon,
  ShapesIcon,
} from "lucide-react"

import {
  DashboardPage,
  MetricCard,
  MetricGrid,
} from "@/components/dashboard/surfaces"
import { TemplateLibraryWorkspace } from "@/components/dashboard/template-library-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { templateItems } from "@/lib/dashboard"

export default function ExportTemplatesPage() {
  return (
    <DashboardPage>
      <Alert>
        <AlertTitle>Templates should reduce review work, not broaden the product</AlertTitle>
        <AlertDescription>
          Every export template here stays tied to a release channel and keeps evidence
          qualifiers explicit instead of acting like a generic writing preset.
        </AlertDescription>
      </Alert>

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

      <TemplateLibraryWorkspace />
    </DashboardPage>
  )
}
