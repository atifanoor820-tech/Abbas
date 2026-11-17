"use client"

import { Check, ChevronRight, Keyboard, Loader2, Mic, X } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useRef } from "react"
import { AbbasAvatar, type AvatarMood } from "@/components/avatar/abbas-avatar"
import { TERMINAL, type Task, type TaskEvent, type TaskStatus } from "@/lib/api"
import { TaskProgress } from "@/components/task-progress"
import { cn } from "@/lib/utils"

const LANG: Record<string, string> = { en: "English", ur: "Urdu", roman_ur: "Roman Urdu", mixed: "Mixed" }

const MOOD: Record<TaskStatus, AvatarMood> = {
  created: "thinking", running: "acting", awaiting_approval: "waiting", blocked: "waiting",
  cancelled: "idle", completed: "success", failed: "error",
}

const STATUS_TEXT: Partial<Record<TaskStatus, string>> = {
  awaiting_approval: "Waiting for your approval", blocked: "Needs more information",
  cancelled: "Stopped", failed: "Couldn't finish",
}

const ABBAS_SUGGESTIONS = ["files dikhao", "notepad kholo", "example.com kholo", "yaad rakho ke meri website abbas.pk hai"]

/** Renders a report: ✔/✘ lines become a checklist, other lines stay as text. */
function Report({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() && l.trim() !== "Done.")
  return (
    <div className="space-y-1.5">
      {lines.map((l, i) => {
        const ok = l.startsWith("✔")
        const bad = l.startsWith("✘")
        if (!ok && !bad) return <p key={i} className="whitespace-pre-wrap break-words">{l}</p>
        return (
          <p key={i} className="flex gap-2">
            <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
              ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
              {ok ? <Check className="size-3" /> : <X className="size-3" />}
            </span>
            <span className="break-words">{l.slice(1).trim()}</span>
          </p>
        )
      })}
    </div>
  )
}

export function Conversation({ tasks, selected, onSelect, onSuggest, agentName, events = {} }: {
  tasks: Task[]
  selected: string | null
  agentName?: string
  events?: Record<string, TaskEvent[]>
  onSelect: (id: string) => void
  onSuggest: (text: string) => void
}) {
  const end = useRef<HTMLDivElement>(null)
  const ordered = [...tasks].reverse()
  const last = ordered.at(-1)
  const suggestions = agentName === "Dashi" ? [] : ABBAS_SUGGESTIONS

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [ordered.length, last?.status, last?.result])

  if (!ordered.length) {
    if (!suggestions.length) return null
    return (
      <div className="flex flex-1 flex-col items-center px-4 pb-6">
        <div className="flex max-w-xl flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onSuggest(s)}
                    className="rounded-full border border-border bg-secondary/40 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground">
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        {ordered.map((t) => {
          const active = !TERMINAL.includes(t.status)
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex flex-col items-end gap-1">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand/12 px-4 py-2.5 text-[15px] ring-1 ring-brand/20">
                  {t.request}
                </div>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  {t.source === "voice" ? <Mic className="size-3" /> : <Keyboard className="size-3" />}
                  {LANG[t.language] ?? t.language}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={cn("group flex w-full gap-3 rounded-2xl p-2 -m-2 text-left transition-colors hover:bg-accent/30",
                  selected === t.id && "bg-accent/30")}
              >
                <AbbasAvatar mood={MOOD[t.status]} size={30} className="mt-0.5" />
                <div className="min-w-0 flex-1 text-[15px] leading-relaxed">
                  {STATUS_TEXT[t.status] && (
                    <p className={cn("mb-1 text-xs font-medium",
                      t.status === "failed" ? "text-danger" : t.status === "cancelled" ? "text-muted-foreground" : "text-warning")}>
                      {STATUS_TEXT[t.status]}
                    </p>
                  )}
                  <TaskProgress task={t} events={events[t.id] ?? t.events ?? []} />
                  {t.result ? (
                    <div className={cn(events[t.id]?.some((e) => e.type === "progress") && "mt-2")}><Report text={t.result} /></div>
                  ) : active ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {t.spec?.interpreted_objective ?? "Working on it…"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <span className="mt-1 flex items-center gap-0.5 text-[11px] text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100">
                    Details <ChevronRight className="size-3" />
                  </span>
                </div>
              </button>
            </motion.div>
          )
        })}
        <div ref={end} />
      </div>
    </div>
  )
}
