"use client"

import { AppWindow, FileText, Globe } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { AbbasAvatar } from "@/components/avatar/abbas-avatar"
import type { AvatarView } from "@/hooks/use-avatar"
import type { ConversationState } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Props {
  view: AvatarView
  level: number
  compact: boolean
  context: ConversationState["context"] | undefined
  agentName?: string
}

/** The avatar and a live caption of what Abbas/Dashi is doing; shrinks once the conversation has messages. */
export function Stage({ view, level, compact, context, agentName = "Abbas" }: Props) {
  const ctx = context ?? {}
  const displayTitle = agentName === "Dashi" ? view.title.replace(/\bAbbas\b/g, "Dashi") : view.title
  const displayDetail =
    agentName === "Dashi" && !compact && !view.detail
      ? "ShowMyTrades multi-profile trading account automation"
      : view.detail
  const chips = [
    ctx.surface === "browser" && ctx.url ? { icon: Globe, label: ctx.page_title || ctx.url } : null,
    ctx.surface === "desktop" && ctx.window ? { icon: AppWindow, label: ctx.window } : null,
    ctx.file ? { icon: FileText, label: ctx.file.split(/[\\/]/).pop() } : null,
  ].filter(Boolean) as { icon: typeof Globe; label: string }[]

  return (
    <motion.section
      layout
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className={cn("flex shrink-0 items-center px-4",
        compact ? "flex-row gap-4 border-b border-border py-3 sm:px-6" : "flex-col justify-center gap-5 py-8 text-center sm:py-12")}
    >
      <motion.div layout>
        <AbbasAvatar mood={view.mood} level={level} size={compact ? 64 : 200} activityIcon={view.icon} />
      </motion.div>

      <motion.div layout className={cn("min-w-0", compact ? "flex-1" : "max-w-lg")} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={displayTitle + (displayDetail || "")}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <p className={cn("font-semibold tracking-tight", compact ? "text-base" : "text-2xl")}
               style={{ color: `var(--mood-${view.mood})` }}>
              {displayTitle}
            </p>
            {displayDetail && (
              <p className={cn("text-muted-foreground", compact ? "truncate text-sm" : "mt-1 text-sm")}>{displayDetail}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {chips.length > 0 && (
          <div className={cn("mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground",
            !compact && "justify-center")}>
            <span>Follow-ups refer to</span>
            {chips.map((c) => (
              <span key={c.label} className="flex max-w-[16rem] items-center gap-1 rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-foreground/80">
                <c.icon className="size-3 shrink-0" />
                <span className="truncate">{c.label}</span>
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </motion.section>
  )
}
