"use client"

import { AlertTriangle, Check, Circle, Loader2, Minus, X } from "lucide-react"
import { TERMINAL, type Task, type TaskEvent } from "@/lib/api"
import { cn } from "@/lib/utils"

type State = "pending" | "running" | "done" | "failed" | "warn" | "skipped"
interface Item { key: string; label: string; state: State; detail: string }
interface Group { name: string; items: Item[] }

function StateIcon({ state, className }: { state: State; className?: string }) {
  const base = cn("size-3.5 shrink-0", className)
  if (state === "running") return <Loader2 className={cn(base, "animate-spin text-brand")} />
  if (state === "done") return <Check className={cn(base, "text-emerald-400")} />
  if (state === "failed") return <X className={cn(base, "text-red-400")} />
  if (state === "warn") return <AlertTriangle className={cn(base, "text-amber-400")} />
  if (state === "skipped") return <Minus className={cn(base, "text-muted-foreground/50")} />
  return <Circle className={cn(base, "text-muted-foreground/40")} />
}

function groupState(items: Item[]): State {
  if (!items.length) return "pending"
  if (items.some((i) => i.state === "running")) return "running"
  if (items.some((i) => i.state === "failed")) return "failed"
  if (items.some((i) => i.state === "warn")) return "warn"
  if (items.every((i) => i.state === "done" || i.state === "skipped")) return "done"
  return items.some((i) => i.state === "done") ? "running" : "pending"
}

/** Builds per-account checklists from the task's plan and its live "progress" events. */
function buildGroups(task: Task, events: TaskEvent[]): Group[] {
  const groups = new Map<string, Map<string, Item>>()
  const ensure = (name: string) => {
    if (!groups.has(name)) groups.set(name, new Map())
    return groups.get(name)!
  }
  // Accounts queued in later plan steps show up as pending from the start.
  for (const step of task.spec?.plan ?? []) {
    const n = (step.args as Record<string, unknown> | undefined)?.account_number
    if (typeof n === "string" && n) ensure(n)
    const many = (step.args as Record<string, unknown> | undefined)?.account_numbers
    if (Array.isArray(many)) many.forEach((m) => typeof m === "string" && m && ensure(m))
  }
  for (const e of events) {
    const p = (e.data as { progress?: { group: string; key: string; label: string; state: State; detail?: string } } | null)?.progress
    if (e.type !== "progress" || !p) continue
    ensure(p.group).set(p.key, { key: p.key, label: p.label, state: p.state, detail: p.detail ?? "" })
  }
  return [...groups].map(([name, items]) => ({ name, items: [...items.values()] }))
}

function summary(items: Item[]): string {
  const running = items.find((i) => i.state === "running")
  if (running) return running.detail ? `${running.label}: ${running.detail}` : `${running.label}…`
  const bad = items.find((i) => i.state === "failed" || i.state === "warn")
  if (bad) return bad.detail || bad.label
  if (items.length === 1) return items[0].detail
  const found = items.find((i) => i.key === "find" && i.detail)
  return items.every((i) => i.state === "done") ? `Done${found ? ` · ${found.detail}` : ""}` : (items[0]?.detail ?? "")
}

export function TaskProgress({ task, events }: { task: Task; events: TaskEvent[] }) {
  const active = !TERMINAL.includes(task.status)
  const groups = buildGroups(task, events)
  if (!groups.length) return null

  const done = groups.filter((g) => groupState(g.items) === "done").length
  const lastAction = active ? [...events].reverse().find((e) => e.type === "tool_started")?.message : undefined

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-3 text-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{groups.length > 1 ? `${done} of ${groups.length} accounts done` : "Progress"}</span>
        {active && <span className="flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> working</span>}
      </div>
      <ul className="space-y-1.5">
        {groups.map((g) => {
          const st = groupState(g.items)
          // Show the sub-steps for the account being worked on, and for any that went wrong.
          const open = g.items.length > 1 && (st === "running" || st === "failed" || st === "warn")
          return (
            <li key={g.name}>
              <div className="flex items-center gap-2">
                <StateIcon state={st} />
                <span className={cn("font-mono", st === "pending" && "text-muted-foreground")}>{g.name}</span>
                <span className={cn("min-w-0 flex-1 truncate text-xs",
                  st === "failed" ? "text-red-300" : st === "warn" ? "text-amber-300" : "text-muted-foreground")}>
                  {st === "pending" && !g.items.length ? "waiting" : summary(g.items)}
                </span>
              </div>
              {open && (
                <ul className="ml-5 mt-1 space-y-1 border-l border-border/60 pl-3">
                  {g.items.map((i) => (
                    <li key={i.key} className="flex items-center gap-2 text-xs">
                      <StateIcon state={i.state} className="size-3" />
                      <span className={cn(i.state === "pending" || i.state === "skipped" ? "text-muted-foreground" : "text-foreground/90")}>
                        {i.label}
                      </span>
                      {i.detail && <span className="truncate text-muted-foreground">· {i.detail}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
      {lastAction && <p className="truncate text-xs text-muted-foreground/80">Now: {lastAction}</p>}
    </div>
  )
}
