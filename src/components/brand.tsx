import { cn } from "@/lib/utils"

/** Dashi's mark: a rising trade line in a rounded square. `busy` adds a soft pulse while Dashi works. */
export function DashiMark({ size = 32, busy = false, className }: { size?: number; busy?: boolean; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center rounded-[28%] bg-brand text-primary-foreground",
        className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {busy && <span className="absolute inset-0 animate-ping rounded-[28%] bg-brand/40" />}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"
           strokeLinejoin="round" className="relative" style={{ width: size * 0.58, height: size * 0.58 }}>
        <path d="M3 17l5.5-5.5 4 4L21 7" />
        <path d="M15 7h6v6" />
      </svg>
    </span>
  )
}
