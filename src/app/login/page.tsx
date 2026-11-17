"use client"

import { Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { DashiMark } from "@/components/brand"
import { api, session } from "@/lib/api"
import { cn } from "@/lib/utils"

const POINTS = [
  "Keep all your trading accounts and ShowMyTrades logins in one place",
  "Reconnect and re-publish accounts on ShowMyTrades with one click",
  "See at a glance which accounts are live, private or missing",
]

const field =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-brand focus:ring-2 focus:ring-ring"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Already signed in on this browser: go straight to the app.
    if (session.token()) api.me().then(() => router.replace("/")).catch(() => session.clear())
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      const res = mode === "login" ? await api.login(email, password) : await api.signup(email, password, name)
      session.clear()
      session.setToken(res.token)
      router.replace("/")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const signup = mode === "signup"

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-brand p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[28%] bg-primary-foreground/15">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"
                 strokeLinejoin="round" className="size-6" aria-hidden>
              <path d="M3 17l5.5-5.5 4 4L21 7" /><path d="M15 7h6v6" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">Dashi</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Every ShowMyTrades account, kept live for you.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((t) => (
              <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-primary-foreground/90">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-foreground/20">
                  <Check className="size-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">Your accounts are visible only to you.</p>
      </aside>

      <div className="grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center lg:items-start lg:text-left">
          <DashiMark size={44} className="lg:hidden" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight lg:mt-0">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Log in to manage your trading accounts." : "It takes less than a minute."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div role="tablist" className="mb-5 grid grid-cols-2 rounded-lg bg-secondary p-1 text-sm">
            {(["login", "signup"] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m}
                      onClick={() => { setMode(m); setError("") }}
                      className={cn("rounded-md py-1.5 font-medium transition-colors",
                        mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {signup && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
                       placeholder="e.g. Ali Khan" className={field} />
              </label>
            )}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                     placeholder="you@example.com" className={field} autoFocus />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Password</span>
              <div className="relative">
                <input type={show ? "text" : "password"} required minLength={signup ? 8 : 1} value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       autoComplete={signup ? "new-password" : "current-password"}
                       placeholder={signup ? "At least 8 characters" : "Your password"} className={cn(field, "pr-10")} />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

            <button type="submit" disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {signup ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {signup ? "Already have an account? " : "New here? "}
            <button type="button" onClick={() => { setMode(signup ? "login" : "signup"); setError("") }}
                    className="font-medium text-brand hover:underline">
              {signup ? "Log in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
      </div>
    </main>
  )
}
