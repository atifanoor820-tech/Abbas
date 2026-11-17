"use client"

import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect } from "react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  side?: "left" | "right"
  className?: string
  children: React.ReactNode
}

/** Slide-in panel with a dimmed backdrop; closes on Escape or backdrop click. */
export function Drawer({ open, onClose, title, side = "right", className, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const from = side === "right" ? "100%" : "-100%"
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className={cn(
              "fixed inset-y-0 z-50 flex w-full max-w-md flex-col border-border bg-popover shadow-2xl",
              side === "right" ? "right-0 border-l" : "left-0 border-r",
              className,
            )}
            initial={{ x: from }} animate={{ x: 0 }} exit={{ x: from }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="text-sm font-semibold">{title}</div>
              <button type="button" onClick={onClose} aria-label="Close"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
