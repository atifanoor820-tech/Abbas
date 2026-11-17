"use client"

import { Check, Eye, EyeOff, ListChecks, Loader2, Plus, RefreshCw, ScanSearch, X } from "lucide-react"
import { useEffect, useState } from "react"
import { api, type DashiConfig, type DashiTradingAccount } from "@/lib/api"
import { cn } from "@/lib/utils"

type Mode = "add" | "update" | "saved" | null

const field =
  "w-full min-w-0 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-brand/60"
const primary =
  "flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"

function ready(a: DashiTradingAccount) {
  return !!(a.account_number && a.password && a.server)
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T
  options: { v: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg bg-secondary/60 p-0.5 text-xs">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
                className={cn("rounded-md px-2.5 py-1 font-medium transition-colors",
                  value === o.v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Dashi's actions above the composer: save accounts, update them on ShowMyTrades, list them, check them all. */
export function DashiActions({ onSend, busy }: { onSend: (text: string) => Promise<void>; busy?: boolean }) {
  const [mode, setMode] = useState<Mode>(null)
  const [config, setConfig] = useState<DashiConfig | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (mode) api.getDashi().then(setConfig).catch((e) => setError((e as Error).message))
  }, [mode])

  const accounts = config?.trading_accounts ?? []

  function toggle(m: Mode) {
    setError("")
    setMode((cur) => (cur === m ? null : m))
  }

  async function runUpdate(nums: string[]) {
    if (!nums.length) return
    setMode(null)
    await onSend(`${nums.join(" ")} update karo`)
  }

  async function checkAll() {
    setMode(null)
    await onSend("saved accounts check karo")
  }

  const tabs: { m: Exclude<Mode, null>; label: string; icon: typeof Plus }[] = [
    { m: "add", label: "Add accounts", icon: Plus },
    { m: "update", label: "Update on ShowMyTrades", icon: RefreshCw },
    { m: "saved", label: "Saved accounts", icon: ListChecks },
  ]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-2 sm:px-6">
      {mode && (
        <div className="mb-2 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">{tabs.find((t) => t.m === mode)?.label}</p>
            <button type="button" onClick={() => setMode(null)} className="p-1 text-muted-foreground hover:text-foreground" title="Close">
              <X className="size-4" />
            </button>
          </div>
          {error && <p className="mb-2 text-xs text-red-300">{error}</p>}
          {mode === "add" && config && <AddForm config={config} onSaved={setConfig} />}
          {mode === "update" && config && (
            <UpdateForm accounts={accounts} busy={busy} onUpdate={runUpdate} onAddFirst={() => setMode("add")} />
          )}
          {mode === "saved" && config && (
            <SavedList accounts={accounts} profiles={config.profiles} busy={busy} onUpdate={(n) => runUpdate([n])} />
          )}
          {!config && !error && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map(({ m, label, icon: Icon }) => (
          <button
            key={m}
            type="button"
            onClick={() => toggle(m)}
            aria-pressed={mode === m}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              mode === m
                ? "border-brand/50 bg-brand/10 text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-brand/40 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => void checkAll()}
          title="Look up every saved account on ShowMyTrades, one by one (changes nothing)"
          className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground disabled:opacity-50"
        >
          <ScanSearch className="size-3.5" /> Check all
        </button>
      </div>
    </div>
  )
}

/** Saves accounts in Settings → Dashi: one with a form, or many pasted one per line. Nothing touches ShowMyTrades. */
function AddForm({ config, onSaved }: { config: DashiConfig; onSaved: (c: DashiConfig) => void }) {
  const [many, setMany] = useState<"one" | "many">("one")
  const [num, setNum] = useState("")
  const [password, setPassword] = useState("")
  const [server, setServer] = useState("")
  const [broker, setBroker] = useState("")
  const [text, setText] = useState("")
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const n = num.trim()
  const existing = config.trading_accounts.find((a) => a.account_number === n)
  const canSaveOne = /^\d{5,12}$/.test(n) && password.trim() && server.trim()

  async function saveOne() {
    try {
      setSaving(true)
      setMsg("")
      const details = { account_number: n, login: n, password: password.trim(), server: server.trim(), broker: broker.trim() }
      const trading_accounts = existing
        ? config.trading_accounts.map((a) => (a.account_number === n ? { ...a, ...details, broker: details.broker || a.broker } : a))
        : [...config.trading_accounts,
           { id: `acc_${Date.now().toString(36)}`, name: `Account ${n}`, platform: "MT5", notes: "", ...details }]
      onSaved(await api.updateDashi({ ...config, trading_accounts }))
      setMsg(existing ? `Account ${n} updated.` : `Account ${n} saved.`)
      setNum(""); setPassword(""); setServer(""); setBroker("")
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function saveMany() {
    try {
      setSaving(true)
      setMsg("")
      const res = await api.importDashiAccounts(text)
      onSaved(res.config)
      if (!res.found) {
        setMsg("No account numbers found.")
        return
      }
      setMsg(`Saved ${res.added.length} new, updated ${res.updated.length}.`)
      setText("")
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const lines = text.split(/\r?\n/).filter((l) => /\d{5,12}/.test(l)).length

  return (
    <div className="space-y-2">
      <Segmented value={many} onChange={(v) => { setMany(v); setMsg("") }}
                 options={[{ v: "one", label: "One" }, { v: "many", label: "Many" }]} />
      {many === "one" ? (
        <form onSubmit={(e) => { e.preventDefault(); if (canSaveOne) void saveOne() }} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={num} onChange={(e) => setNum(e.target.value.replace(/\s/g, ""))} placeholder="Account number"
                   inputMode="numeric" className={cn(field, "font-mono")} autoFocus />
            <div className="relative">
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                     placeholder="Investor password" className={cn(field, "pr-9 font-mono")} />
              <button type="button" onClick={() => setShow((v) => !v)} title={show ? "Hide" : "Show"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Server, e.g. FxPro-MT5 Demo" className={field} />
            <input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="Broker (optional)" className={field} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">
              {msg || (existing ? "Already saved; saving replaces its details." : "")}
            </span>
            <button type="submit" disabled={!canSaveOne || saving} className={primary}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (lines) void saveMany() }} className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} autoFocus
                    placeholder={"One account per line:  number / password / server\n592235145 / Abc@123 / FxPro-MT5 Demo\n40001234 / hello1 / FTMO-Demo"}
                    className={cn(field, "font-mono text-xs")} />
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">{msg || (lines ? `${lines} account(s)` : "")}</span>
            <button type="submit" disabled={!lines || saving} className={primary}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save all
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

/** Pick one or many saved accounts; Dashi fills password and server from the saved details and updates them in turn. */
function UpdateForm({ accounts, busy, onUpdate, onAddFirst }: {
  accounts: DashiTradingAccount[]
  busy?: boolean
  onUpdate: (nums: string[]) => Promise<void>
  onAddFirst: () => void
}) {
  const list = accounts.filter((a) => a.account_number)
  const readyNums = list.filter(ready).map((a) => a.account_number)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [typed, setTyped] = useState("")

  const typedNums = Array.from(new Set(typed.match(/\d{5,12}/g) ?? []))
  const unknown = typedNums.filter((n) => !list.some((a) => a.account_number === n))
  const notReady = typedNums.filter((n) => list.some((a) => a.account_number === n) && !readyNums.includes(n))
  const nums = Array.from(new Set([...picked, ...typedNums.filter((n) => readyNums.includes(n))]))

  function flip(n: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const allOn = readyNums.length > 0 && readyNums.every((n) => picked.has(n))

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (nums.length && !busy) void onUpdate(nums) }} className="space-y-3">
      <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type account numbers (space or comma separated)…"
             className={cn(field, "font-mono")} autoFocus />
      {(unknown.length > 0 || notReady.length > 0) && (
        <p className="text-xs text-amber-300">
          {unknown.length > 0 && <>Not saved: {unknown.join(", ")}. <button type="button" onClick={onAddFirst} className="underline">Add first</button>. </>}
          {notReady.length > 0 && <>Missing password or server: {notReady.join(", ")}.</>}
        </p>
      )}

      {list.length > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>…or pick saved accounts</span>
            <button type="button" disabled={!readyNums.length}
                    onClick={() => setPicked(allOn ? new Set() : new Set(readyNums))}
                    className="hover:text-foreground disabled:opacity-50">
              {allOn ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="max-h-48 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
            {list.map((a) => {
              const ok = ready(a)
              return (
                <label key={a.id} className={cn("flex items-center gap-3 px-3 py-2 text-sm", ok ? "cursor-pointer hover:bg-accent/30" : "opacity-50")}>
                  <input type="checkbox" disabled={!ok} checked={picked.has(a.account_number)}
                         onChange={() => flip(a.account_number)} className="size-3.5 accent-[var(--brand)]" />
                  <span className="font-mono">{a.account_number}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {a.server || "no server"}{!ok && " · missing details"}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-muted-foreground">
          {busy ? "Wait for the current task to finish." : nums.length ? `${nums.length} account(s) will be updated one after another.` : ""}
        </span>
        <button type="submit" disabled={busy || !nums.length} className={primary}>
          <RefreshCw className="size-3.5" /> Update {nums.length > 1 ? nums.length : ""}
        </button>
      </div>
    </form>
  )
}

function SavedList({ accounts, profiles, busy, onUpdate }: {
  accounts: DashiTradingAccount[]
  profiles: DashiConfig["profiles"]
  busy?: boolean
  onUpdate: (num: string) => Promise<void>
}) {
  const signedIn = profiles.filter((p) => p.email && p.password).length
  const list = accounts.filter((a) => a.account_number)
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {signedIn}/{profiles.length} ShowMyTrades profiles have a login · {list.filter(ready).length}/{list.length} accounts ready
      </p>
      {list.length === 0 && <p className="py-2 text-sm text-muted-foreground">No accounts saved yet.</p>}
      <div className="max-h-56 divide-y divide-border/60 overflow-y-auto">
        {list.map((a) => {
          const ok = ready(a)
          const profile = profiles.find((p) => p.id === a.profile_id)
          return (
            <div key={a.id} className="flex items-center gap-3 py-2 text-sm">
              <span className={cn("size-1.5 shrink-0 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")} />
              <span className="font-mono">{a.account_number}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {a.server || "no server"}{profile ? ` · ${profile.name.replace("ShowMyTrades ", "")}` : ""}
                {!ok && " · missing details"}
              </span>
              <button type="button" disabled={!ok || busy} onClick={() => void onUpdate(a.account_number)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40">
                <RefreshCw className="size-3" /> Update
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
