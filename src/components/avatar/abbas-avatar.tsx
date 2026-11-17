"use client"

import type { LucideIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type AvatarMood = "idle" | "listening" | "thinking" | "acting" | "waiting" | "speaking" | "success" | "error"

const COLOR: Record<AvatarMood, string> = {
  idle: "var(--mood-idle)",
  listening: "var(--mood-listening)",
  thinking: "var(--mood-thinking)",
  acting: "var(--mood-acting)",
  waiting: "var(--mood-waiting)",
  speaking: "var(--mood-speaking)",
  success: "var(--mood-success)",
  error: "var(--mood-error)",
}

// Where the eyes look (in face units) and how open they are.
const EYES: Record<AvatarMood, { x: number; y: number; open: number }> = {
  idle: { x: 0, y: 0, open: 1 },
  listening: { x: 0, y: -1, open: 1.15 },
  thinking: { x: 5, y: -6, open: 0.7 },
  acting: { x: 7, y: 2, open: 0.9 },
  waiting: { x: 0, y: 0, open: 1 },
  speaking: { x: 0, y: 0, open: 1 },
  success: { x: 0, y: 0, open: 0.35 },
  error: { x: 0, y: 3, open: 0.6 },
}

function mouthPath(mood: AvatarMood, level: number): string {
  switch (mood) {
    case "speaking": {
      const h = 3 + Math.min(1, level) * 13 // opens with the real audio level
      return `M 38 66 Q 50 ${66 - h * 0.35} 62 66 Q 50 ${66 + h} 38 66 Z`
    }
    case "listening":
      return "M 44 67 Q 50 71 56 67 Q 50 69 44 67 Z"
    case "thinking":
      return "M 43 68 Q 49 66 57 67 Q 49 68 43 68 Z"
    case "waiting":
      return "M 42 67 L 58 67 Q 50 68.5 42 67 Z"
    case "success":
      return "M 38 63 Q 50 77 62 63 Q 50 70 38 63 Z"
    case "error":
      return "M 40 71 Q 50 63 60 71 Q 50 66 40 71 Z"
    default:
      return "M 40 65 Q 50 73 60 65 Q 50 69 40 65 Z"
  }
}

interface Props {
  mood: AvatarMood
  /** 0..1 - microphone level while listening, speech level while speaking */
  level?: number
  size?: number
  activityIcon?: LucideIcon | null
  className?: string
}

/** Abbas's face: an animated glass orb whose expression, aura and motion show what the agent is doing. */
export function AbbasAvatar({ mood, level = 0, size = 200, activityIcon: Icon, className }: Props) {
  const reduce = useReducedMotion()
  const color = COLOR[mood]
  const eyes = EYES[mood]
  const busy = mood === "thinking" || mood === "acting"
  const small = size < 64
  const [blink, setBlink] = useState(false)

  // Natural blinking at random intervals (not while looking happy or squinting).
  useEffect(() => {
    if (reduce) return
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true)
        setTimeout(() => setBlink(false), 140)
        loop()
      }, 2600 + Math.random() * 3200)
    }
    loop()
    return () => clearTimeout(t)
  }, [reduce])

  const auraScale = mood === "listening" || mood === "speaking" ? 1 + Math.min(1, level) * 0.28 : 1
  const eyeOpen = blink && mood !== "success" ? 0.08 : eyes.open

  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}
         role="img" aria-label={`Abbas is ${mood}`}>
      {/* Aura */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 65%)` }}
        animate={reduce ? { opacity: 0.35 } : {
          opacity: mood === "idle" ? [0.22, 0.34, 0.22] : 0.45,
          scale: mood === "idle" ? [0.92, 1.02, 0.92] : auraScale,
        }}
        transition={mood === "idle" ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" } : { type: "spring", stiffness: 180, damping: 18 }}
      />

      {/* Activity ring */}
      {!small && (
        <motion.svg viewBox="0 0 100 100" className="absolute inset-0"
                    animate={busy && !reduce ? { rotate: 360 } : { rotate: 0 }}
                    transition={busy ? { duration: mood === "thinking" ? 2.4 : 1.4, repeat: Infinity, ease: "linear" } : { duration: 0.6 }}>
          <circle cx="50" cy="50" r="47" fill="none" stroke="oklch(1 0 0 / 6%)" strokeWidth="0.8" />
          <motion.circle
            cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round"
            animate={{
              strokeDasharray: busy ? "60 236" : mood === "waiting" ? "4 6" : "296 0",
              opacity: mood === "idle" ? 0.25 : 0.9,
            }}
            transition={{ duration: 0.6 }}
          />
        </motion.svg>
      )}

      {/* Orbiting sparks while working */}
      <AnimatePresence>
        {busy && !small && !reduce && (
          <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1, rotate: -360 }}
                      exit={{ opacity: 0 }} transition={{ rotate: { duration: 6, repeat: Infinity, ease: "linear" } }}>
            {[0, 120, 240].map((deg) => (
              <span key={deg} className="absolute left-1/2 top-1/2 size-1.5 rounded-full"
                    style={{ background: color, boxShadow: `0 0 10px ${color}`,
                             transform: `rotate(${deg}deg) translateY(-${size * 0.5}px)` }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Face */}
      <motion.svg
        viewBox="0 0 100 100"
        className="relative"
        style={{ width: size * 0.78, height: size * 0.78 }}
        animate={reduce ? {} : mood === "idle" ? { y: [0, -3, 0] } : mood === "error" ? { x: [0, -3, 3, -2, 0] } : { y: 0, x: 0 }}
        transition={mood === "idle" ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.45 }}
      >
        <defs>
          <radialGradient id="abbas-glass" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="oklch(0.36 0.03 255)" />
            <stop offset="60%" stopColor="oklch(0.2 0.02 260)" />
            <stop offset="100%" stopColor="oklch(0.15 0.015 260)" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#abbas-glass)" />
        <motion.circle cx="50" cy="50" r="45.5" fill="none" strokeWidth="1"
                       animate={{ stroke: color, strokeOpacity: 0.55 }} transition={{ duration: 0.5 }} />
        <ellipse cx="38" cy="22" rx="16" ry="7" fill="oklch(1 0 0 / 7%)" />

        {/* Eyes */}
        {[36, 64].map((cx) => (
          <motion.rect
            key={cx}
            width="9" rx="4.5"
            animate={{
              x: cx - 4.5 + eyes.x,
              y: 40 + eyes.y - (13 * eyeOpen) / 2,
              height: Math.max(1.2, 13 * eyeOpen),
              fill: color,
            }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          />
        ))}

        {/* Mouth */}
        <motion.path
          animate={{ d: mouthPath(mood, level), fill: color }}
          transition={{ type: "spring", stiffness: mood === "speaking" ? 600 : 260, damping: mood === "speaking" ? 30 : 24 }}
          opacity={0.9}
        />
      </motion.svg>

      {/* What it is using right now */}
      <AnimatePresence>
        {Icon && !small && (
          <motion.div
            key={Icon.displayName ?? "icon"}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            className="absolute bottom-[6%] right-[6%] grid place-items-center rounded-full border border-border bg-popover shadow-lg"
            style={{ width: size * 0.22, height: size * 0.22, color }}
          >
            <Icon style={{ width: size * 0.11, height: size * 0.11 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
