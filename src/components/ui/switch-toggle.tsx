"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

/** Accessible on/off switch (role="switch"). */
export function Switch({ checked, onChange, label, disabled }: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-40",
        checked ? "border-brand/60 bg-brand/80" : "border-border bg-secondary",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 35 }}
        className={cn("block size-4.5 rounded-full shadow", checked ? "ml-[22px] bg-primary-foreground" : "ml-[3px] bg-muted-foreground")}
      />
    </button>
  )
}
