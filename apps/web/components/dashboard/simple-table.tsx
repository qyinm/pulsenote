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
  selectedRowKey,
  onRowSelect,
}: {
  columns: TableColumn[]
  rows: TableRowData[]
  emptyTitle: string
  emptyDescription: string
  selectedRowKey?: string
  onRowSelect?: (rowKey: string) => void
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
            <TableRow
              key={row.key}
              data-state={row.key === selectedRowKey ? "selected" : undefined}
              tabIndex={onRowSelect ? 0 : undefined}
              onClick={onRowSelect ? () => onRowSelect(row.key) : undefined}
              onKeyDown={
                onRowSelect
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onRowSelect(row.key)
                      }
                    }
                  : undefined
              }
              className={cn(
                onRowSelect &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              )}
            >
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
