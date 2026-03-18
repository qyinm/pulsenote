import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { DashboardPage as DashboardPageShell } from "@/components/dashboard/surfaces"
import { SectionCards } from "@/components/section-cards"

import { releaseRecords } from "@/lib/dashboard"

export default function DashboardPage() {
  return (
    <DashboardPageShell className="gap-6 py-4 md:py-6">
      <SectionCards />
      <ChartAreaInteractive />
      <DataTable data={releaseRecords} />
    </DashboardPageShell>
  )
}
