"use client"

import { Shield, ShieldCheck, Zap } from "lucide-react"
import { motion } from "motion/react"
import type { Autonomy } from "@/lib/api"
import { cn } from "@/lib/utils"

const OPTIONS: { level: Autonomy; label: string; icon: typeof Shield; hint: string; tone: string }[] = [
  { level: "ask", label: "Ask", icon: Shield, tone: "text-foreground",
    hint: "Ask before every action that changes something" },
  { level: "trusted", label: "Trusted", icon: ShieldCheck, tone: "text-[var(--mood-success)]",
    hint: "Open, click and type on its own; ask only for steps that are hard to undo" },
  { level: "full", label: "Full", icon: Zap, tone: "text-[var(--mood-waiting)]",
    hint: "Never ask. Stop button, fail-safe and blocked shortcuts still apply" },
]

const FULL_WARNING =
  "Full autonomy: Abbas will open apps, click, type and press shortcuts WITHOUT asking.\n\n" +
  "It can misunderstand you, and web pages it reads could try to trick it. " +
  "Keep an eye on it and use Stop (or say “ruko”) if anything looks wrong.\n\nTurn on Full autonomy?"

/** How freely Abbas acts: Ask / Trusted / Full. */
export function AutonomySwitch({ value, onChange }: { value: Autonomy | undefined; onChange: (l: Autonomy) => void }) {
  return (
    <div role="radiogroup" aria-label="Autonomy" className="flex rounded-lg border border-border bg-secondary/40 p-0.5">
      {OPTIONS.map((o) => {
        const active = value === o.level
        return (
          <button
            key={o.level}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${o.label}: ${o.hint}`}
            onClick={() => {
              if (active) return
              if (o.level === "full" && !confirm(FULL_WARNING)) return
              onChange(o.level)
            }}
            className={cn("relative flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              active ? o.tone : "text-muted-foreground hover:text-foreground")}
          >
            {active && (
              <motion.span layoutId="autonomy-pill" className="absolute inset-0 rounded-md bg-accent ring-1 ring-border"
                           transition={{ type: "spring", stiffness: 500, damping: 35 }} />
            )}
            <o.icon className="relative size-3.5" />
            <span className="relative hidden sm:inline">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
