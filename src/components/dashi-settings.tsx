"use client"

import { Check, ChevronDown, ClipboardPaste, Eye, EyeOff, Link2, Loader2, Plus, Search, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { api, DASHI_ONLY, type DashiConfig, type DashiProfile, type DashiTradingAccount } from "@/lib/api"
import { cn } from "@/lib/utils"

const input =
  "w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50 hover:border-border focus:border-brand/60 focus:bg-background/50"
const ghostBtn =
  "flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"

export function DashiSettings() {
  const [config, setConfig] = useState<DashiConfig | null>(null)
  const [savedJson, setSavedJson] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [shown, setShown] = useState<Set<string>>(new Set())
  const [profilesOpen, setProfilesOpen] = useState(false)
  const [urlOpen, setUrlOpen] = useState<Set<string>>(new Set())
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState("")

  useEffect(() => {
    void load()
  }, [])

  function apply(data: DashiConfig) {
    setConfig(data)
    setSavedJson(JSON.stringify(data))
  }

  async function load() {
    try {
      setLoading(true)
      apply(await api.getDashi())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function save(updated?: DashiConfig) {
    const toSave = updated || config
    if (!toSave) return
    try {
      setSaving(true)
      setError(null)
      apply(await api.updateDashi(toSave))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const dirty = useMemo(() => !!config && JSON.stringify(config) !== savedJson, [config, savedJson])

  function setAgent(agent: "abbas" | "dashi") {
    if (!config || config.active_agent === agent) return
    void save({ ...config, active_agent: agent })
  }

  function updateProfile(idx: number, field: keyof DashiProfile, val: string) {
    if (!config) return
    const profiles = [...config.profiles]
    profiles[idx] = { ...profiles[idx], [field]: val }
    setConfig({ ...config, profiles })
  }

  function addProfile() {
    if (!config) return
    const n = config.profiles.length + 1
    const p: DashiProfile = {
      id: `profile_${Date.now().toString(36)}`,
      name: `ShowMyTrades Profile ${n}`,
      email: "",
      password: "",
      profile_url: "https://showmytrades.com/",
      notes: "",
    }
    setConfig({ ...config, profiles: [...config.profiles, p] })
    setProfilesOpen(true)
  }

  function removeProfile(idx: number) {
    if (!config) return
    setConfig({ ...config, profiles: config.profiles.filter((_, i) => i !== idx) })
  }

  function updateAccount(idx: number, field: keyof DashiTradingAccount, val: string) {
    if (!config) return
    const accounts = [...config.trading_accounts]
    accounts[idx] = { ...accounts[idx], [field]: val }
    setConfig({ ...config, trading_accounts: accounts })
  }

  function addAccount() {
    if (!config) return
    const a: DashiTradingAccount = {
      id: `acc_${Date.now().toString(36)}`,
      name: `Trading Account ${config.trading_accounts.length + 1}`,
      account_number: "",
      broker: "",
      server: "",
      platform: "MT5",
      login: "",
      password: "",
      notes: "",
    }
    setConfig({ ...config, trading_accounts: [...config.trading_accounts, a] })
  }

  function removeAccount(idx: number) {
    if (!config) return
    setConfig({ ...config, trading_accounts: config.trading_accounts.filter((_, i) => i !== idx) })
  }

  function toggle(set: Set<string>, id: string, update: (s: Set<string>) => void) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    update(next)
  }

  function matches(acc: DashiTradingAccount) {
    const q = query.trim().toLowerCase()
    return !q || [acc.account_number, acc.broker, acc.server, acc.name].some((v) => v?.toLowerCase().includes(q))
  }

  async function importAccounts() {
    try {
      setImporting(true)
      setImportMsg("")
      const res = await api.importDashiAccounts(importText)
      apply(res.config)
      if (!res.found) {
        setImportMsg("No account numbers found.")
        return
      }
      setImportMsg(`Saved ${res.added.length} new, updated ${res.updated.length}.`)
      setImportText("")
    } catch (e) {
      setImportMsg((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading…
      </div>
    )
  }
  if (!config) return error ? <p className="text-xs text-danger">{error}</p> : null

  const linked = config.profiles.filter((p) => p.email && p.password).length
  const accounts = config.trading_accounts

  return (
    <div className="space-y-6">
      {/* Active agent (hidden while Abbas is switched off) */}
      <div className={cn("flex items-center justify-between gap-3", DASHI_ONLY && "hidden")}>
        <span className="text-sm">Active agent</span>
        <div role="radiogroup" aria-label="Active agent" className="inline-flex rounded-lg bg-secondary/60 p-0.5 text-xs">
          {(["abbas", "dashi"] as const).map((a) => {
            const on = config.active_agent === a
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setAgent(a)}
                className={cn(
                  "rounded-md px-3 py-1 font-medium capitalize transition-colors",
                  on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {a}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Profiles (collapsed by default) */}
      <div className={cn(!DASHI_ONLY && "border-t border-border pt-4")}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setProfilesOpen((v) => !v)}
            className="flex items-center gap-2 text-left text-sm"
            aria-expanded={profilesOpen}
          >
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !profilesOpen && "-rotate-90")} />
            ShowMyTrades profiles
            <span className="text-xs text-muted-foreground">
              {linked}/{config.profiles.length} signed in
            </span>
          </button>
          <button type="button" onClick={addProfile} className={ghostBtn}>
            <Plus className="size-3.5" /> Add
          </button>
        </div>

        {profilesOpen && (
          <div className="mt-2 divide-y divide-border/60">
            {config.profiles.map((p, idx) => {
              const ready = !!(p.email && p.password)
              return (
                <div key={p.id || idx} className="py-1">
                  <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-1 sm:grid-cols-[auto_1fr_1.3fr_1fr_auto_auto]">
                    <span
                      className={cn("size-1.5 rounded-full", ready ? "bg-success" : "bg-muted-foreground/40")}
                      title={ready ? "Login saved" : "No login yet"}
                    />
                    <input
                      value={p.name}
                      onChange={(e) => updateProfile(idx, "name", e.target.value)}
                      placeholder="Name"
                      className={cn(input, "col-span-2 font-medium sm:col-span-1")}
                    />
                    <input
                      value={p.email}
                      onChange={(e) => updateProfile(idx, "email", e.target.value)}
                      placeholder="Email"
                      className={cn(input, "col-start-2 sm:col-auto")}
                    />
                    <input
                      type="password"
                      value={p.password || ""}
                      onChange={(e) => updateProfile(idx, "password", e.target.value)}
                      placeholder="Password"
                      className={input}
                    />
                    <button
                      type="button"
                      onClick={() => toggle(urlOpen, p.id, setUrlOpen)}
                      className={cn("row-start-1 col-start-4 p-1 text-muted-foreground hover:text-foreground sm:col-auto sm:row-auto", urlOpen.has(p.id) && "text-foreground")}
                      title="Profile URL"
                    >
                      <Link2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProfile(idx)}
                      className="row-start-1 col-start-5 p-1 text-muted-foreground hover:text-danger sm:col-auto sm:row-auto"
                      title="Remove profile"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  {urlOpen.has(p.id) && (
                    <input
                      value={p.profile_url}
                      onChange={(e) => updateProfile(idx, "profile_url", e.target.value)}
                      placeholder="https://showmytrades.com/"
                      className={cn(input, "mt-1 ml-3 w-[calc(100%-0.75rem)] text-muted-foreground")}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Trading accounts */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm">
            Trading accounts <span className="text-xs text-muted-foreground">{accounts.length}</span>
          </p>
          <div className="flex gap-0.5">
            <button type="button" onClick={() => setImportOpen((v) => !v)} className={ghostBtn}>
              <ClipboardPaste className="size-3.5" /> Paste
            </button>
            <button type="button" onClick={addAccount} className={ghostBtn}>
              <Plus className="size-3.5" /> Add
            </button>
          </div>
        </div>

        {importOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={4}
              placeholder={"One per line:  number / password / server\n592235145 / Abc@123 / FxPro-MT5 Demo"}
              className="w-full rounded-md border border-border bg-background/50 px-2.5 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus:border-brand/60"
            />
            <div className="flex items-center justify-end gap-3">
              <span className="text-xs text-muted-foreground">{importMsg}</span>
              <button
                type="button"
                disabled={importing || !importText.trim()}
                onClick={() => void importAccounts()}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                {importing && <Loader2 className="size-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}

        {accounts.length > 5 && (
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-md bg-secondary/40 py-1.5 pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground/60 focus:bg-secondary/70"
            />
          </div>
        )}

        <div className="mt-2 divide-y divide-border/60">
          {accounts.length === 0 && (
            <p className="py-4 text-xs text-muted-foreground">No accounts yet. Paste them, or tell Dashi in chat.</p>
          )}
          {accounts.map((acc, idx) => {
            if (!matches(acc)) return null
            const incomplete = !acc.account_number || !acc.password || !acc.server
            const profile = config.profiles.find((p) => p.id === acc.profile_id)
            return (
              <div
                key={acc.id || idx}
                className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-1 py-1 sm:grid-cols-[auto_1fr_1.4fr_0.9fr_1.1fr_auto]"
              >
                <span
                  className={cn("size-1.5 rounded-full", incomplete ? "bg-warning" : "bg-success")}
                  title={
                    (incomplete ? "Missing number, password or server" : "Ready") +
                    (profile ? ` · last found in ${profile.name}` : "")
                  }
                />
                <input
                  value={acc.account_number}
                  onChange={(e) => updateAccount(idx, "account_number", e.target.value)}
                  placeholder="Account no."
                  className={cn(input, "font-mono")}
                />
                <input
                  value={acc.server}
                  onChange={(e) => updateAccount(idx, "server", e.target.value)}
                  placeholder="Server"
                  className={input}
                />
                <input
                  value={acc.broker}
                  onChange={(e) => updateAccount(idx, "broker", e.target.value)}
                  placeholder="Broker"
                  className={cn(input, "col-start-2 sm:col-auto")}
                />
                <div className="flex items-center">
                  <input
                    type={shown.has(acc.id) ? "text" : "password"}
                    value={acc.password || ""}
                    onChange={(e) => updateAccount(idx, "password", e.target.value)}
                    placeholder="Password"
                    className={cn(input, "font-mono")}
                  />
                  <button
                    type="button"
                    onClick={() => toggle(shown, acc.id, setShown)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title={shown.has(acc.id) ? "Hide" : "Show"}
                  >
                    {shown.has(acc.id) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeAccount(idx)}
                  className="row-start-1 col-start-4 p-1 text-muted-foreground hover:text-danger sm:col-auto sm:row-auto"
                  title="Remove account"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save bar: only when something changed */}
      {(dirty || saved) && (
        <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-lg border border-border bg-background/90 px-3 py-2 backdrop-blur">
          {saved && !dirty ? (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="size-3.5" /> Saved
            </span>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
              <button type="button" onClick={() => config && apply(JSON.parse(savedJson))} className={ghostBtn}>
                Discard
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Save
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
