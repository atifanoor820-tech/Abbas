"use client"

import { BookMarked, MessageSquarePlus, Settings2, SlidersHorizontal, Trash2 } from "lucide-react"
import Link from "next/link"
import { AbbasAvatar, type AvatarMood } from "@/components/avatar/abbas-avatar"
import type { ConversationInfo, SystemStatus } from "@/lib/api"
import { DASHI_ONLY } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Props {
  mood: AvatarMood
  conversations: ConversationInfo[]
  currentId: string | null
  memoryCount: number
  status: SystemStatus | null
  connected: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onOpenMemory: () => void
  onOpenSystem: () => void
}

function relative(iso: string) {
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z")
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return d.toLocaleDateString([], { day: "numeric", month: "short" })
}

export function Sidebar(p: Props) {
  const dots = p.status
    ? [
        { label: "Gemini", ok: p.status.reasoning.mode !== "rules" },
        { label: "Jev", ok: p.status.reflex.engine === "jev" },
        { label: p.status.memory.database === "postgres" ? "Postgres" : "SQLite", ok: p.status.memory.database === "postgres" },
        { label: "Voice", ok: p.status.asr.available && p.status.tts.available },
      ]
    : []

  const isDashi = DASHI_ONLY || p.status?.agent?.active === "dashi"
  const agentName = DASHI_ONLY ? "Dashi" : p.status?.agent?.name || "Abbas"

  return (
    <nav className="flex h-full flex-col bg-surface/80">
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <AbbasAvatar mood={p.mood} size={36} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold tracking-tight">{agentName}</p>
            {isDashi && (
              <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                ShowMyTrades
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", p.connected ? "bg-success" : "bg-danger")} />
            {p.connected ? "online" : "offline"} · {isDashi ? "Trading Agent" : "Desktop Agent"}
          </p>
        </div>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={p.onNew}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm font-medium transition-colors hover:border-brand/40 hover:bg-secondary"
        >
          <MessageSquarePlus className="size-4 text-brand" /> New conversation
        </button>
      </div>

      <p className="px-5 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Conversations</p>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2">
        {p.conversations.length === 0 && (
          <li className="px-3 py-2 text-xs text-muted-foreground">Your conversations will appear here.</li>
        )}
        {p.conversations.map((c) => (
          <li key={c.id} className="group relative">
            <button
              type="button"
              onClick={() => p.onSelect(c.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                p.currentId === c.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {p.currentId === c.id && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-brand" />}
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              <span className="text-[11px] text-muted-foreground/70 group-hover:invisible">{relative(c.updated_at)}</span>
            </button>
            <button
              type="button"
              aria-label={`Delete conversation ${c.title}`}
              onClick={() => {
                if (confirm(`Delete “${c.title}” and ${agentName}'s memory of it? Long-term memories are kept.`)) p.onDelete(c.id)
              }}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-danger group-hover:block"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t border-border p-3">
        <button type="button" onClick={p.onOpenMemory}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground">
          <BookMarked className="size-4" /> Memory
          <span className="ml-auto rounded-full bg-secondary px-2 text-[11px]">{p.memoryCount}</span>
        </button>
        <Link href="/settings"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground">
          <SlidersHorizontal className="size-4" /> Settings
          {p.status && (
            <span className="ml-auto rounded-full bg-secondary px-2 text-[11px] capitalize">{p.status.actions.autonomy}</span>
          )}
        </Link>
        <button type="button" onClick={p.onOpenSystem}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground">
          <Settings2 className="size-4" /> System status
          <span className="ml-auto flex gap-1">
            {dots.map((d) => (
              <span key={d.label} title={`${d.label}: ${d.ok ? "ready" : "not configured"}`}
                    className={cn("size-1.5 rounded-full", d.ok ? "bg-success" : "bg-warning")} />
            ))}
          </span>
        </button>
      </div>
    </nav>
  )
}
