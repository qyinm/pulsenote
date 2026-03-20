"use client"

import Link from "next/link"
import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
} from "react"

import { searchResults } from "@/lib/dashboard"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export function SearchWorkspace() {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)

  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    if (!normalized) {
      return searchResults
    }

    return searchResults.filter((item) =>
      [item.title, item.summary, item.type, item.meta]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    )
  }, [deferredQuery])

  const groupedResults = useMemo(() => {
    return filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
      acc[item.type] ??= []
      acc[item.type].push(item)
      return acc
    }, {})
  }, [filtered])

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <label htmlFor="workspace-search" className="mb-2 block text-sm font-medium">
          Search release workflow state
        </label>
        <Input
          id="workspace-search"
          value={query}
          onChange={(event) => {
            const value = event.currentTarget.value
            startTransition(() => {
              setQuery(value)
            })
          }}
          placeholder="Search releases, claims, evidence, approvals, or templates"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["sdk", "approval", "evidence", "template", "blocked"].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={query === item}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                startTransition(() => {
                  setQuery(item)
                })
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(groupedResults).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No results matched this sample search. Try release names, approval stages,
          or evidence tags.
        </div>
      ) : (
        Object.entries(groupedResults).map(([group, items]) => (
          <div key={group} className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">{group}</h3>
                <p className="text-sm text-muted-foreground">
                  Results are grouped by workflow entity type.
                </p>
              </div>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <div className="grid gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <Badge variant="secondary">{item.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                    <span className="text-xs text-muted-foreground">{item.meta}</span>
                  </div>
                  <Link
                    href={item.route}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "w-fit"
                    )}
                  >
                    Open record
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
