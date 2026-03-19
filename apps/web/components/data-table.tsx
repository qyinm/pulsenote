"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  CircleAlertIcon,
  FileStackIcon,
  PackageCheckIcon,
  ShieldCheckIcon,
  SquareArrowOutUpRightIcon,
} from "lucide-react"

import type { ReleaseRecord } from "@/lib/dashboard"
import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const views = [
  { label: "All records", value: "all" },
  { label: "At risk", value: "at-risk" },
  { label: "Approval", value: "approval" },
  { label: "Ready", value: "ready" },
] as const

function filterRecords(records: ReleaseRecord[], view: string) {
  if (view === "at-risk") {
    return records.filter((record) => record.claimCheck !== "Clear")
  }

  if (view === "approval") {
    return records.filter((record) => record.status === "Approval queue")
  }

  if (view === "ready") {
    return records.filter((record) => record.status === "Ready to export")
  }

  return records
}

function badgeVariantForStatus(status: ReleaseRecord["status"]) {
  if (status === "Ready to export") {
    return "secondary" as const
  }

  return "outline" as const
}

function badgeVariantForClaimCheck(claimCheck: ReleaseRecord["claimCheck"]) {
  if (claimCheck === "Clear") {
    return "outline" as const
  }

  return "secondary" as const
}

export function DataTable({ data }: { data: ReleaseRecord[] }) {
  const [view, setView] = React.useState<string>("all")

  const counts = React.useMemo(
    () => ({
      atRisk: filterRecords(data, "at-risk").length,
      approval: filterRecords(data, "approval").length,
      ready: filterRecords(data, "ready").length,
    }),
    [data]
  )

  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(String(value))}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <Label htmlFor="release-view" className="sr-only">
            View
          </Label>
          <Select
            value={view}
            onValueChange={(value) => {
              if (value !== null) {
                setView(value)
              }
            }}
            items={views.map((item) => ({ label: item.label, value: item.value }))}
          >
            <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="release-view">
              <SelectValue placeholder="Select a view" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {views.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="all">All records</TabsTrigger>
            <TabsTrigger value="at-risk">
              At risk <Badge variant="secondary">{counts.atRisk}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approval">
              Approval <Badge variant="secondary">{counts.approval}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready <Badge variant="secondary">{counts.ready}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ShieldCheckIcon data-icon="inline-start" />
            Review warnings
          </Button>
          <Button variant="secondary" size="sm">
            <PackageCheckIcon data-icon="inline-start" />
            Export publish pack
          </Button>
        </div>
      </div>

      {views.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className="flex flex-col px-4 lg:px-6"
        >
          <ReleaseRecordsTable records={filterRecords(data, item.value)} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function ReleaseRecordsTable({ records }: { records: ReleaseRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No release records in this view.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>Release</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Workflow stage</TableHead>
            <TableHead>Claim check</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="text-right">Publish target</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>
                <ReleaseRecordViewer record={record} />
              </TableCell>
              <TableCell>{record.channel}</TableCell>
              <TableCell>
                <Badge variant={badgeVariantForStatus(record.status)}>{record.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={badgeVariantForClaimCheck(record.claimCheck)}>
                  {record.claimCheck}
                </Badge>
              </TableCell>
              <TableCell>{record.owner}</TableCell>
              <TableCell className="text-right">{record.publishWindow}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" className="ml-auto" />}
                  >
                    <ChevronDownIcon />
                    <span className="sr-only">Open record menu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem>
                      <SquareArrowOutUpRightIcon />
                      Open record
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ShieldCheckIcon />
                      Open claim check
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <PackageCheckIcon />
                      Export pack
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ReleaseRecordViewer({ record }: { record: ReleaseRecord }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="h-auto justify-start px-0 text-left font-medium text-foreground"
        >
          {record.release}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-2">
          <DrawerTitle>{record.release}</DrawerTitle>
          <DrawerDescription>{record.summary}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-4 pb-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badgeVariantForStatus(record.status)}>{record.status}</Badge>
            <Badge variant={badgeVariantForClaimCheck(record.claimCheck)}>
              {record.claimCheck}
            </Badge>
          </div>
          <div className="grid gap-3 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Channel</span>
              <span className="font-medium">{record.channel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium">{record.owner}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Publish target</span>
              <span className="font-medium">{record.publishWindow}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Evidence links</span>
              <span className="font-medium">{record.evidenceCount}</span>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium">
              <CircleAlertIcon />
              Next action
            </div>
            <p className="text-muted-foreground">{record.nextAction}</p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium">
              <FileStackIcon />
              Review summary
            </div>
            <p className="text-muted-foreground">
              This release record is labeled as sample data and should be replaced by
              authenticated workflow state once backend integration is available.
            </p>
          </div>
        </div>
        <DrawerFooter>
          <Button variant="secondary">
            <ShieldCheckIcon data-icon="inline-start" />
            Open approvals
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
