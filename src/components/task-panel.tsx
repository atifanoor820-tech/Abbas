"use client"

import {
  AlertTriangle, Ban, Check, CheckCircle2, Circle, FileText, ImageIcon, Loader2, ShieldAlert, Trash2, X, XCircle,
} from "lucide-react"
import { useState } from "react"
import { RiskBadge, StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { api, TERMINAL, type Task, type TaskEvent } from "@/lib/api"
import { cn } from "@/lib/utils"

type StepState = "pending" | "running" | "done" | "failed"

function stepStates(task: Task): StepState[] {
  const plan = task.spec?.plan ?? []
  const states: StepState[] = plan.map(() => "pending")
  for (const e of task.events ?? []) {
    const i = typeof e.data?.step === "number" ? (e.data.step as number) : -1
    if (i < 0 || i >= states.length) continue
    if (e.type === "tool_started") states[i] = "running"
    if (e.type === "tool_completed") states[i] = "done"
    if (e.type === "tool_failed" && !e.message.includes("retrying")) states[i] = "failed"
  }
  if (TERMINAL.includes(task.status)) return states.map((s) => (s === "running" ? "failed" : s))
  return states
}

const EVENT_TONE: Record<string, string> = {
  review_completed: "text-info",
  tool_output: "text-muted-foreground",
  tool_completed: "text-success",
  task_completed: "text-success",
  file_created: "text-success",
  file_updated: "text-success",
  tool_failed: "text-danger",
  task_failed: "text-danger",
  approval_required: "text-warning",
  task_blocked: "text-warning",
  task_cancelled: "text-muted-foreground",
  decision_made: "text-lime-300",
  memory_saved: "text-info",
  memory_deleted: "text-info",
}

function time(iso: string) {
  return new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z").toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

const ENGINE_STYLE: Record<string, string> = {
  jev: "bg-lime-400/15 text-lime-300",
  gemini: "bg-info/15 text-info",
  local: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
}

function Decision({ event }: { event: TaskEvent }) {
  const d = event.data ?? {}
  const engine = String(d.engine ?? "none")
  const conf = typeof d.confidence === "number" ? d.confidence : typeof d.p_yes === "number" ? d.p_yes : null
  const errors = Array.isArray(d.errors) ? (d.errors as string[]) : []
  return (
    <div className="mt-0.5 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] uppercase", ENGINE_STYLE[engine] ?? ENGINE_STYLE.none)}>
          {engine}
        </span>
        <span className="text-[11px] text-muted-foreground">{String(d.purpose ?? "")}</span>
        {conf !== null && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1 w-14 overflow-hidden rounded bg-muted">
              <span className="block h-full bg-lime-400" style={{ width: `${Math.round(conf * 100)}%` }} />
            </span>
            {Math.round(conf * 100)}%
          </span>
        )}
      </div>
      <p className="break-words text-muted-foreground">{event.message}</p>
      {errors.length > 0 && <p className="text-[11px] text-warning/80">fell back after: {errors.join("; ")}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function TaskPanel({ task, onChanged }: { task: Task | null; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!task) {
    return (
      <div className="grid h-full place-items-center p-8 text-center text-sm text-muted-foreground">
        Select a task to see its plan, live timeline and evidence.
      </div>
    )
  }

  const spec = task.spec
  const states = stepStates(task)
  const events = task.events ?? []
  const shots = events.filter((e) => e.type === "screenshot_captured" && e.data?.path)
  const files = events.filter((e) => e.type === "file_created" || e.type === "file_updated")
  const active = !TERMINAL.includes(task.status)

  async function act(name: string, fn: () => Promise<unknown>) {
    setBusy(name)
    setError(null)
    try {
      await fn()
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          {spec && <RiskBadge risk={spec.risk_level} />}
          {spec && (
            <span className="text-xs text-muted-foreground">
              interpreted by {spec.interpreter === "llm" ? "LLM" : "rule engine"}
            </span>
          )}
        </div>
        <p className="text-base font-medium leading-snug">{spec?.interpreted_objective ?? task.request}</p>
        {spec && spec.normalized_request !== task.request.toLowerCase() && (
          <p className="text-xs text-muted-foreground">normalised: “{spec.normalized_request}”</p>
        )}
      </div>

      {task.status === "awaiting_approval" && (
        <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
          <div className="flex gap-2 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="font-medium text-warning/90">Approval required</p>
              <p className="text-warning/80">{spec?.approval_reason}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={!!busy} onClick={() => act("approve", () => api.approve(task.id, true))}>
              {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />} Approve
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("reject", () => api.approve(task.id, false))}>
              <X /> Reject
            </Button>
          </div>
        </div>
      )}

      {spec?.clarification_question && (
        <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning/90">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          {spec.clarification_question}
        </div>
      )}

      {!!spec?.plan.length && (
        <Section title="Plan">
          <ol className="space-y-1.5">
            {spec.plan.map((s, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                {states[i] === "done" ? <CheckCircle2 className="mt-0.5 size-4 text-success" />
                  : states[i] === "failed" ? <XCircle className="mt-0.5 size-4 text-danger" />
                  : states[i] === "running" ? <Loader2 className="mt-0.5 size-4 animate-spin text-info" />
                  : <Circle className="mt-0.5 size-4 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p>{s.description || s.tool}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {s.tool} {Object.keys(s.args).length ? JSON.stringify(s.args) : ""}
                  </p>
                </div>
                {s.risk !== "low" && <RiskBadge risk={s.risk} />}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {!!shots.length && (
        <Section title="Screenshots">
          <div className="grid gap-2">
            {shots.map((e) => (
              <a key={e.id} href={api.screenshotUrl(String(e.data!.path))} target="_blank" rel="noreferrer"
                 className="overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={api.screenshotUrl(String(e.data!.path))} alt="Captured page screenshot" className="w-full" />
              </a>
            ))}
          </div>
        </Section>
      )}

      {!!files.length && (
        <Section title="Files changed">
          {files.map((e) => (
            <p key={e.id} className="flex items-center gap-2 font-mono text-xs">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="truncate">{String(e.data?.path ?? e.message)}</span>
              <span className="text-muted-foreground">{e.type === "file_created" ? "created" : "updated"}</span>
            </p>
          ))}
        </Section>
      )}

      <Section title="Timeline">
        <ol className="relative space-y-2 border-l border-border pl-4">
          {events.map((e: TaskEvent) => (
            <li key={e.id} className="text-sm">
              <span className="absolute -left-[4.5px] mt-1.5 size-2 rounded-full bg-border" />
              <div className="flex items-baseline gap-2">
                <span className={cn("font-mono text-[11px]", EVENT_TONE[e.type] ?? "text-info")}>{e.type}</span>
                <span className="text-[11px] text-muted-foreground">{time(e.created_at)}</span>
                {e.type === "screenshot_captured" && <ImageIcon className="size-3 text-muted-foreground" />}
              </div>
              {e.type === "decision_made" ? (
                <Decision event={e} />
              ) : e.type === "tool_output" ? (
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {e.message}
                </pre>
              ) : e.type === "review_completed" ? (
                <div className="mt-1 space-y-1 rounded-lg border border-info/20 bg-info/5 p-2">
                  <p className="text-muted-foreground">{e.message}</p>
                  {Array.isArray(e.data?.remaining) && (e.data.remaining as string[]).length > 0 && (
                    <ul className="list-inside list-disc text-xs text-muted-foreground/80">
                      {(e.data.remaining as string[]).map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  )}
                </div>
              ) : e.message && e.type !== "screenshot_captured" && (
                <p className="whitespace-pre-wrap break-words text-muted-foreground">{e.message}</p>
              )}
            </li>
          ))}
        </ol>
      </Section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2 border-t border-border pt-4">
        {active ? (
          <Button variant="destructive" size="sm" disabled={!!busy} onClick={() => act("cancel", () => api.cancel(task.id))}>
            <Ban /> Cancel task
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={!!busy}
            onClick={() => {
              if (confirm("Delete this task, its transcript, events and screenshots?")) void act("delete", () => api.remove(task.id))
            }}
          >
            <Trash2 /> Delete transcript
          </Button>
        )}
      </div>
    </div>
  )
}
