"use client"

import { CircleCheck, KeyRound, Wallet } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth"
import { DashiMark } from "@/components/brand"
import { api, type DashiConfig } from "@/lib/api"
import { cn } from "@/lib/utils"

/** Fired by forms that change saved accounts or profiles, so the numbers here refresh. */
export const DASHI_CHANGED = "dashi:changed"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

function Stat({ icon: Icon, label, short, value, sub, tone = "default" }: {
  icon: typeof Wallet
  label: string
  /** Shown instead of the label on phones */
  short: string
  value: string
  sub: string
  tone?: "default" | "warn"
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-muted-foreground sm:gap-2 sm:text-xs">
        <Icon className={cn("size-3.5 shrink-0 sm:size-4", tone === "warn" ? "text-warning" : "text-brand")} /> <span className="truncate sm:hidden">{short}</span><span className="hidden truncate sm:inline">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight sm:mt-2 sm:text-2xl">{value}</p>
      <p className={cn("mt-0.5 hidden text-xs sm:block", tone === "warn" ? "text-warning" : "text-muted-foreground")}>{sub}</p>
    </div>
  )
}

/** Start screen: a greeting and where the user's accounts stand, above the task cards. */
export function HomeHero() {
  const { user, isAdmin, viewAs, users } = useAuth()
  const [cfg, setCfg] = useState<DashiConfig | null>(null)

  useEffect(() => {
    const load = () => api.getDashi().then(setCfg).catch(() => setCfg(null))
    load()
    window.addEventListener(DASHI_CHANGED, load)
    return () => window.removeEventListener(DASHI_CHANGED, load)
  }, [])

  const first = (user.name || user.email.split("@")[0]).split(" ")[0]
  const viewing = isAdmin && viewAs ? users.find((u) => u.id === viewAs) : undefined
  const accounts = (cfg?.trading_accounts ?? []).filter((a) => a.account_number)
  const ready = accounts.filter((a) => a.password && a.server).length
  const profiles = cfg?.profiles ?? []
  const linked = profiles.filter((p) => p.email && p.password).length

  return (
    <section className="mx-auto mt-auto w-full max-w-3xl px-4 pb-4 pt-8 sm:px-6 sm:pt-10">
      <div className="flex items-center gap-3">
        <DashiMark size={44} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {viewing ? `Viewing ${viewing.name || viewing.email}` : `${greeting()}, ${first}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {viewing ? viewing.email : "Here's where your ShowMyTrades accounts stand."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon={Wallet} label="Saved accounts" short="Accounts" value={cfg ? String(accounts.length) : "–"}
              sub={accounts.length ? "trading accounts on file" : "add your first account below"} />
        <Stat icon={CircleCheck} label="Ready to update" short="Ready" value={cfg ? `${ready}/${accounts.length}` : "–"}
              sub={accounts.length && ready < accounts.length ? "some need a password or server" : "have password and server"}
              tone={accounts.length && ready < accounts.length ? "warn" : "default"} />
        <Stat icon={KeyRound} label="ShowMyTrades logins" short="Logins" value={cfg ? `${linked}/${profiles.length}` : "–"}
              sub={linked ? "profiles Dashi can sign in to" : "add one in Settings to start"}
              tone={cfg && !linked ? "warn" : "default"} />
      </div>
      {cfg && !linked && (
        <p className="mt-3 text-sm text-muted-foreground">
          Dashi needs at least one ShowMyTrades login to update accounts.{" "}
          <Link href="/settings" className="font-medium text-brand hover:underline">Add it in Settings</Link>
        </p>
      )}
    </section>
  )
}
