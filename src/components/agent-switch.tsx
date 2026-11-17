"use client"

import { Bot, Sparkles, TrendingUp, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export type ActiveAgent = "abbas" | "dashi"

interface Props {
  value?: ActiveAgent
  onChange: (agent: ActiveAgent) => void
  disabled?: boolean
}

export function AgentSwitch({ value = "abbas", onChange, disabled }: Props) {
  const isDashi = value === "dashi"

  return (
    <div
      role="group"
      aria-label="Active Agent Selection"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1 text-xs"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("abbas")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all",
          !isDashi
            ? "bg-brand text-brand-foreground shadow-sm shadow-black/20"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
        title="Abbas: General desktop, browser, and coding agent"
      >
        <Bot className="size-3.5" />
        <span>Abbas</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("dashi")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all",
          isDashi
            ? "bg-amber-500 text-black font-semibold shadow-sm shadow-amber-500/30"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
        title="Dashi: ShowMyTrades multi-profile trading account agent"
      >
        <Zap className="size-3.5 fill-current" />
        <span>Dashi</span>
        {isDashi && (
          <span className="ml-0.5 rounded-full bg-black/20 px-1 text-[10px] font-bold uppercase">
            Active
          </span>
        )}
      </button>
    </div>
  )
}
