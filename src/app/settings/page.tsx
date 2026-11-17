"use client"

import {
  AppWindow, ArrowLeft, Check, FolderOpen, Globe, Loader2, MousePointerClick, PackageSearch, Plus, Search, Shield,
  ShieldCheck, Volume2, Zap,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Switch } from "@/components/ui/switch-toggle"
import { DashiSettings } from "@/components/dashi-settings"
import { api, DASHI_ONLY, type AppsView, type Autonomy, type DesktopApp, type RuntimeSettings, type SettingsView } from "@/lib/api"
import { cn } from "@/lib/utils"

const AUTONOMY: { level: Autonomy; title: string; text: string; icon: typeof Shield; tone: string }[] = [
  { level: "ask", title: "Ask", icon: Shield, tone: "var(--mood-idle)",
    text: "Asks before every action that changes something — opening, clicking, typing." },
  { level: "trusted", title: "Trusted", icon: ShieldCheck, tone: "var(--mood-success)",
    text: "Acts on its own. Asks only for steps that are hard to undo (deleting, sending, buying, shortcuts)." },
  { level: "full", title: "Full", icon: Zap, tone: "var(--mood-waiting)",
    text: "Never asks. Stop, the mouse-corner fail-safe and blocked shortcuts still work." },
]

const FULL_WARNING =
  "Full autonomy: Abbas will open apps, click, type and press shortcuts WITHOUT asking.\n\n" +
  "It can misunderstand you, and web pages it reads could try to trick it. Keep an eye on it and " +
  "use Stop (or say “ruko”) if anything looks wrong.\n\nTurn on Full autonomy?"

function Section({ title, description, children, aside }: {
  title: string
  description?: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function ToggleRow({ icon: Icon, title, text, checked, onChange, busy }: {
  icon: typeof Shield
  title: string
  text: string
  checked: boolean
  onChange: (v: boolean) => void
  busy?: boolean
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
      {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      <Switch checked={checked} onChange={onChange} label={title} disabled={busy} />
    </div>
  )
}

function AppRow({ app, onToggle }: { app: DesktopApp; onToggle: (on: boolean) => void }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold",
        app.allowed ? "bg-brand/15 text-brand" : "bg-secondary text-muted-foreground")}>
        {app.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", !app.allowed && "text-muted-foreground")}>{app.name}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground/60">
          {app.source === "allowlist" ? `built-in · ${app.command}` : app.id}
        </p>
      </div>
      <span className={cn("hidden text-[11px] sm:inline", app.allowed ? "text-emerald-300" : "text-muted-foreground")}>
        {app.allowed ? "Allowed" : "Off"}
      </span>
      <Switch checked={app.allowed} onChange={onToggle} label={`Allow ${app.name}`} />
    </li>
  )
}

function FolderList({ fixed, extra, busy, onChange }: {
  fixed: string[]
  extra: string[]
  busy: boolean
  onChange: (folders: string[]) => void
}) {
  const [path, setPath] = useState("")
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {fixed.map((f) => (
          <li key={f} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FolderOpen className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{f}</span>
            <span className="text-[11px] text-muted-foreground">from .env</span>
          </li>
        ))}
        {extra.map((f) => (
          <li key={f} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FolderOpen className="size-4 text-brand" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{f}</span>
            <button type="button" disabled={busy} onClick={() => onChange(extra.filter((x) => x !== f))}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-red-300">
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (path.trim()) {
            onChange([...extra, path.trim()])
            setPath("")
          }
        }}
      >
        <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="D:\abbas work"
               aria-label="Folder path to allow"
               className="min-w-0 flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-xs outline-none focus:border-brand/50" />
        <button type="submit" disabled={busy || !path.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Allow folder
        </button>
      </form>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [apps, setApps] = useState<AppsView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "on" | "off">("all")
  const [speak, setSpeak] = useState(true)

  const loadApps = useCallback(async () => {
    try { setApps(await api.apps()) } catch (e) { setError((e as Error).message) }
  }, [])

  useEffect(() => {
    api.settings().then(setSettings).catch((e) => setError((e as Error).message))
    void loadApps()
    try { setSpeak(localStorage.getItem("abbas.speak") !== "0") } catch {}
  }, [loadApps])

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  async function change(changes: Partial<RuntimeSettings>, key: string) {
    setBusy(key)
    setError(null)
    try {
      setSettings(await api.updateSettings(changes))
      if ("allow_any_app" in changes || "app_access" in changes) await loadApps()
      flashSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function toggleApps(ids: string[], on: boolean) {
    if (!apps || ids.length === 0) return
    const set = new Set(ids)
    const prev = apps
    const next = apps.apps.map((a) => (set.has(a.id) ? { ...a, allowed: on } : a))
    setApps({ ...apps, apps: next, allowed: next.filter((a) => a.allowed).length }) // optimistic
    try {
      await api.setApps(Object.fromEntries(ids.map((id) => [id, on])))
      flashSaved()
    } catch (e) {
      setApps(prev)
      setError((e as Error).message)
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (apps?.apps ?? []).filter((a) =>
      (!q || a.name.toLowerCase().includes(q)) &&
      (filter === "all" || (filter === "on" ? a.allowed : !a.allowed)))
  }, [apps, query, filter])

  const ed = settings?.editable
  const NAME = DASHI_ONLY ? "Dashi" : "Abbas"

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="size-4" /> {NAME}
          </Link>
          <h1 className="flex-1 text-sm font-semibold">Settings</h1>
          <span className={cn("flex items-center gap-1 text-xs text-emerald-300 transition-opacity", saved ? "opacity-100" : "opacity-0")}
                aria-live="polite">
            <Check className="size-3.5" /> Saved
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        <Section title="Dashi" description="ShowMyTrades profiles and the trading accounts Dashi manages.">
          <DashiSettings />
        </Section>

        <Section title={`How freely ${NAME} acts`} description="Changes apply to the next request.">
          <div role="radiogroup" aria-label="Autonomy" className="grid gap-2 sm:grid-cols-3">
            {AUTONOMY.map((o) => {
              const active = ed?.autonomy === o.level
              return (
                <button
                  key={o.level}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!ed || busy === "autonomy"}
                  onClick={() => {
                    if (active) return
                    if (o.level === "full" && !confirm(FULL_WARNING)) return
                    void change({ autonomy: o.level }, "autonomy")
                  }}
                  className={cn("rounded-xl border p-4 text-left transition-colors",
                    active ? "border-transparent bg-accent ring-2" : "border-border hover:bg-accent/40")}
                  style={active ? { ["--tw-ring-color" as string]: o.tone } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <o.icon className="size-4" style={{ color: o.tone }} />
                    <span className="text-sm font-semibold">{o.title}</span>
                    {active && <Check className="ml-auto size-4" style={{ color: o.tone }} />}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{o.text}</p>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title={DASHI_ONLY ? "Browser" : "What Abbas may control"}>
          <div className="divide-y divide-border">
            {!DASHI_ONLY && <ToggleRow icon={MousePointerClick} title="Screen control (mouse & keyboard)"
                       text="PyAutoGUI clicks and typing anywhere on screen, used when an app can't be controlled directly."
                       checked={!!ed?.screen_actions} busy={busy === "screen"}
                       onChange={(v) => void change({ screen_actions: v }, "screen")} />}
            <ToggleRow icon={Globe} title="Show the browser window"
                       text={`Watch ${NAME} browse in ${settings?.fixed.browser_channel ?? "the browser"}. Off = works invisibly in the background.`}
                       checked={ed ? !ed.browser_headless : false} busy={busy === "browser"}
                       onChange={(v) => void change({ browser_headless: !v }, "browser")} />
            {!DASHI_ONLY && <ToggleRow icon={PackageSearch} title="Open any installed app"
                       text="Off = only the built-in apps (Notepad, Calculator, Explorer) can be opened."
                       checked={!!ed?.allow_any_app} busy={busy === "anyapp"}
                       onChange={(v) => void change({ allow_any_app: v }, "anyapp")} />}
          </div>
        </Section>

        {!DASHI_ONLY && (<>
        <Section
          title="Desktop apps"
          description={apps ? `${apps.allowed} of ${apps.total} apps can be opened by Abbas.` : "Loading installed apps…"}
          aside={
            <div className="flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
              {([["all", "All except off"], ["selected", "Only switched on"]] as const).map(([v, label]) => (
                <button key={v} type="button" disabled={!ed || busy === "access"}
                        onClick={() => ed?.app_access !== v && void change({ app_access: v }, "access")}
                        className={cn("rounded-md px-2.5 py-1 font-medium transition-colors",
                          ed?.app_access === v ? "bg-accent text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </div>
          }
        >
          <p className="-mt-1 mb-4 text-xs text-muted-foreground">
            {ed?.app_access === "selected"
              ? "New apps you install stay off until you switch them on."
              : "New apps you install are allowed unless you switch them off."}
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5 focus-within:border-brand/50">
              <Search className="size-4 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search apps"
                     aria-label="Search apps" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </label>
            <div className="flex rounded-lg border border-border p-0.5 text-xs">
              {(["all", "on", "off"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)}
                        className={cn("rounded-md px-2.5 py-1 capitalize", filter === f ? "bg-accent text-foreground" : "text-muted-foreground")}>
                  {f === "all" ? "All" : f === "on" ? "Allowed" : "Off"}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{visible.length} shown</span>
            <span className="flex gap-3">
              <button type="button" onClick={() => void toggleApps(visible.map((a) => a.id), true)} className="hover:text-foreground">
                Allow shown
              </button>
              <button type="button" onClick={() => void toggleApps(visible.map((a) => a.id), false)} className="hover:text-foreground">
                Turn shown off
              </button>
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            {!apps ? (
              <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Reading installed apps…
              </p>
            ) : visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No apps match.</p>
            ) : (
              <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
                {visible.map((a) => <AppRow key={a.id} app={a} onToggle={(on) => void toggleApps([a.id], on)} />)}
              </ul>
            )}
          </div>
        </Section>

        <Section title="Folders Abbas can work in"
                 description="Abbas can create folders, projects and files only inside these. System folders can't be added.">
          <FolderList
            fixed={settings?.fixed.workspaces ?? []}
            extra={ed?.extra_folders ?? []}
            busy={busy === "folders"}
            onChange={(folders) => void change({ extra_folders: folders }, "folders")}
          />
        </Section>

        <Section title="Voice">
          <ToggleRow icon={Volume2} title="Speak replies" text="Abbas reads results aloud after tasks you started (this browser only)."
                     checked={speak}
                     onChange={(v) => {
                       setSpeak(v)
                       try { localStorage.setItem("abbas.speak", v ? "1" : "0") } catch {}
                       flashSaved()
                     }} />
        </Section>

        </>)}

        {settings && (
          <Section title="Set in .env" description="Change these in the .env file, then restart the agent service.">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Brain", settings.fixed.gemini_model ? `Gemini ${settings.fixed.gemini_model}` : "Not configured"],
                ["Reflexes", settings.fixed.jev_model ? `Jev ${settings.fixed.jev_model}` : "Not configured"],
                ["Database", settings.fixed.database === "postgres" ? "PostgreSQL" : "SQLite"],
                ["Speech", settings.fixed.speech_summary || `Whisper ${settings.fixed.asr_model} · voice ${settings.fixed.tts_voice}`],
                ["Browser", settings.fixed.browser_channel],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="truncate" title={v}>{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        <p className="flex items-center gap-2 px-1 pb-4 text-xs text-muted-foreground">
          <AppWindow className="size-3.5" />
          Always on: Stop button, “ruko”, mouse-corner fail-safe, blocked shortcuts, and file access only inside your workspace.
        </p>
      </main>
    </div>
  )
}
