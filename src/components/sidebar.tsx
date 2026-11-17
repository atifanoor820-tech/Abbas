"use client"

import { BookMarked, LogOut, MessageSquarePlus, Settings2, SlidersHorizontal, Trash2, Users } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth"
import { AbbasAvatar, type AvatarMood } from "@/components/avatar/abbas-avatar"
import { DashiMark } from "@/components/brand"
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
  const { user, isAdmin, users, viewAs, setViewAs, logout } = useAuth()
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
      <div className="flex items-center gap-3 px-4 pb-4 pt-4">
        {isDashi ? <DashiMark size={34} busy={p.mood === "acting" || p.mood === "thinking"} /> : <AbbasAvatar mood={p.mood} size={36} />}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-semibold tracking-tight">{agentName}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", p.connected ? "bg-success" : "bg-danger")} />
            {p.connected ? "Online" : "Offline"} · {isDashi ? "ShowMyTrades assistant" : "Desktop Agent"}
          </p>
        </div>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={p.onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-brand/90"
        >
          <MessageSquarePlus className="size-4" /> New conversation
        </button>
        {isAdmin && (
          <label className="mt-3 block">
            <span className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              <Users className="size-3" /> Viewing
            </span>
            <select value={viewAs} onChange={(e) => setViewAs(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:border-brand">
              <option value="">Everyone (all users)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}{u.role === "admin" ? " (you)" : ""} · {u.conversations} chats
                </option>
              ))}
            </select>
          </label>
        )}
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
              <span className="min-w-0 flex-1">
                <span className="block truncate">{c.title}</span>
                {c.owner && <span className="block truncate text-[11px] text-muted-foreground/80">{c.owner}</span>}
              </span>
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
        {isAdmin && <button type="button" onClick={p.onOpenSystem}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground">
          <Settings2 className="size-4" /> System status
          <span className="ml-auto flex gap-1">
            {dots.map((d) => (
              <span key={d.label} title={`${d.label}: ${d.ok ? "ready" : "not configured"}`}
                    className={cn("size-1.5 rounded-full", d.ok ? "bg-success" : "bg-warning")} />
            ))}
          </span>
        </button>}
        <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold uppercase text-brand">
            {(user.name || user.email)[0]}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="flex items-center gap-1.5 truncate text-sm font-medium">
              {user.name || user.email.split("@")[0]}
              {isAdmin && <span className="rounded bg-brand/10 px-1 text-[10px] font-semibold text-brand">ADMIN</span>}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
          </span>
          <button type="button" onClick={() => void logout()} title="Log out" aria-label="Log out"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </nav>
  )
}
