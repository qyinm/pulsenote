import type { ReactNode } from "react"

import { EmptyState } from "@/components/dashboard/surfaces"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type TableColumn = {
  key: string
  label: string
  className?: string
}

type TableRowData = {
  key: string
  cells: Record<string, ReactNode>
}

export function SimpleTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  columns: TableColumn[]
  rows: TableRowData[]
  emptyTitle: string
  emptyDescription: string
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader className="bg-muted/80">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={cn(column.className)}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              {columns.map((column) => (
                <TableCell key={column.key} className={cn(column.className)}>
                  {row.cells[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
