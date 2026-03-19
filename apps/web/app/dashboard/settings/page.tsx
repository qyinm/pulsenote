import {
  BellIcon,
  FileCogIcon,
  Settings2Icon,
  ShieldCheckIcon,
} from "lucide-react"

import {
  DashboardPage,
  MetricCard,
  MetricGrid,
  SurfaceCard,
} from "@/components/dashboard/surfaces"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { workspaceSettings } from "@/lib/dashboard"

function FieldRenderer({
  field,
}: {
  field: (typeof workspaceSettings)[number]["fields"][number]
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
        </Label>
        {field.type === "switch" ? (
          <Switch id={field.id} defaultChecked={field.checked} />
        ) : null}
      </div>

      {field.type === "text" || field.type === "email" ? (
        <Input id={field.id} type={field.type} defaultValue={field.value} />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea id={field.id} defaultValue={field.value} />
      ) : null}

      {field.type === "select" ? (
        <Select defaultValue={field.value}>
          <SelectTrigger id={field.id}>
            <SelectValue placeholder={field.value} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}

      <p className="text-sm text-muted-foreground">{field.hint}</p>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <DashboardPage>
      <MetricGrid>
        <MetricCard
          title="Workspace rules"
          value="4"
          detail="Operational sections"
          description="Settings stay scoped to release workflow policy, not a general content studio."
          badge="Policy"
          icon={Settings2Icon}
        />
        <MetricCard
          title="Review safeguards"
          value="2"
          detail="Mandatory sign-off rules"
          description="These safeguards prevent risky language from reaching export without the right approver."
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Notification rules"
          value="2"
          detail="Claim and export alerts"
          description="Notifications should surface blocked states early, without creating noisy handoffs."
          icon={BellIcon}
        />
        <MetricCard
          title="Export defaults"
          value="2"
          detail="Format + evidence link policy"
          description="Default export rules keep the final publish pack consistent and traceable."
          icon={FileCogIcon}
        />
      </MetricGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        {workspaceSettings.map((section) => (
          <SurfaceCard
            key={section.id}
            title={section.title}
            description={section.description}
            footer={
              <div className="flex w-full justify-end">
                <Button variant="outline" size="sm" disabled>
                  Sample settings only
                </Button>
              </div>
            }
          >
            <div className="grid gap-5">
              {section.fields.map((field) => (
                <FieldRenderer key={field.id} field={field} />
              ))}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </DashboardPage>
  )
}
