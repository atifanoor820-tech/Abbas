import { Brain, Database, FolderLock, Mic, MousePointerClick, Speaker, Wrench, Zap } from "lucide-react"
import type { EngineStatus, SystemStatus } from "@/lib/api"
import { cn } from "@/lib/utils"

function Row({ icon: Icon, title, ok, detail, setup }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  ok: boolean
  detail: string
  setup?: string | null
}) {
  return (
    <div className="space-y-1 rounded-lg bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="size-4 text-muted-foreground" />
        <span className="font-medium">{title}</span>
        <span className={cn("ml-auto size-2 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")} />
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
      {setup && <code className="block break-all rounded bg-background px-2 py-1 text-[11px] text-amber-200">{setup}</code>}
    </div>
  )
}

function engineDetail(e: EngineStatus, extra: string) {
  return `${e.engine} · ${extra}${e.available ? "" : " · not installed"}`
}

export function StatusPanel({ status, error }: { status: SystemStatus | null; error: string | null }) {
  if (error) {
    return (
      <div className="m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
        Agent service unreachable: {error}
        <code className="mt-2 block text-[11px]">uv run uvicorn services.agent_api.main:app --port 8000</code>
      </div>
    )
  }
  if (!status) return <p className="p-4 text-sm text-muted-foreground">Loading status…</p>

  return (
    <div className="space-y-3 p-4">
      <Row
        icon={Brain}
        title="Brain · planning"
        ok={status.reasoning.mode !== "rules"}
        detail={status.reasoning.mode === "gemini"
          ? `Gemini ${status.reasoning.model}`
          : status.reasoning.mode === "llm"
            ? `LLM ${status.reasoning.model}`
            : "Offline rule engine — fixed command set."}
        setup={status.reasoning.mode === "rules" ? "ABBAS_GEMINI_API_KEY=… in .env" : null}
      />
      <Row
        icon={Zap}
        title="Reflexes · decisions"
        ok={status.reflex.engine === "jev"}
        detail={status.reflex.engine === "jev"
          ? `Jev ${status.reflex.model} · acts above ${Math.round(status.reflex.min_confidence * 100)}% confidence`
            + (status.reflex.images ? " · screen boxes on" : "")
          : status.reflex.engine === "gemini"
            ? "Jev not configured — Gemini makes element/risk decisions (slower)"
            : "Jev not configured — local text matcher; risky clicks always need approval"}
        setup={status.reflex.engine !== "jev" ? "ABBAS_JEV_API_KEY=… in .env" : null}
      />
      <Row
        icon={MousePointerClick}
        title="Hands · actions"
        ok
        detail={`Playwright (${status.actions.browser_headless ? "headless" : "visible"} browser) · pywinauto · `
          + `PyAutoGUI ${status.actions.screen_actions ? "on, approval-gated" : "off"}`}
      />
      <Row icon={Mic} title="Speech-to-text" ok={status.asr.available}
           detail={engineDetail(status.asr, `${status.asr.model} on ${status.asr.device}`)} setup={status.asr.setup} />
      <Row icon={Speaker} title="Text-to-speech" ok={status.tts.available}
           detail={engineDetail(status.tts, String(status.tts.voice ?? ""))} setup={status.tts.setup} />
      <Row
        icon={Database}
        title="Database"
        ok={status.memory.database === "postgres"}
        detail={status.memory.database === "postgres"
          ? "PostgreSQL · tasks, conversations, LangGraph checkpoints + store"
          : "SQLite (local file) · set ABBAS_DATABASE_URL for PostgreSQL"}
        setup={status.memory.database === "postgres" ? null : "uv run python scripts/setup_postgres.py"}
      />
      <Row icon={FolderLock} title="Authorised workspace" ok detail={status.workspaces.join(" · ")} />

      <div className="space-y-2 rounded-lg bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Wrench className="size-4 text-muted-foreground" /> Tools
        </div>
        <ul className="space-y-1.5">
          {status.tools.map((t) => (
            <li key={t.name} className="text-xs">
              <span className="font-mono text-foreground">{t.name}</span>
              {t.risk !== "low" && <span className="ml-1.5 text-amber-300">({t.risk} risk · approval)</span>}
              <p className="text-muted-foreground">{t.description}</p>
            </li>
          ))}
        </ul>
        <p className="pt-1 text-xs text-muted-foreground">
          Launchable apps: {status.allowed_apps.join(", ") || "none"}
        </p>
      </div>
    </div>
  )
}
