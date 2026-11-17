"use client"

import { ArrowUp, Loader2, Mic, Square, Volume2, VolumeX } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type VoiceState = "idle" | "listening" | "transcribing" | "processing" | "speaking"

interface Props {
  voiceState: VoiceState
  level: number
  asrReady: boolean
  asrSetup: string | null
  micError: string | null
  speakReplies: boolean
  ttsReady: boolean
  agentName?: string
  onToggleSpeak: () => void
  onSend: (text: string) => Promise<void>
  onMicStart: () => void
  onMicStop: () => void
  onStopSpeaking: () => void
}

export function Composer(p: Props) {
  const [text, setText] = useState("")
  const box = useRef<HTMLTextAreaElement>(null)
  const listening = p.voiceState === "listening"

  // Grow with the text, up to a few lines.
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  async function send() {
    const t = text.trim()
    if (!t) return
    setText("")
    if (box.current) {
      box.current.style.height = "auto"
    }
    try {
      await p.onSend(t)
    } catch {
      setText(t)
    }
  }

  return (
    <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className={cn(
          "flex items-end gap-2 rounded-3xl border bg-card/80 p-2 shadow-xl shadow-black/20 backdrop-blur transition-colors",
          listening ? "border-[var(--mood-listening)]/60" : "border-border focus-within:border-brand/50",
        )}>
          {p.voiceState === "speaking" ? (
            <button type="button" onClick={p.onStopSpeaking} aria-label="Stop speaking"
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-accent">
              <Square className="size-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!p.asrReady || p.voiceState === "transcribing"}
              onClick={listening ? p.onMicStop : p.onMicStart}
              aria-label={listening ? "Stop recording and send" : "Push to talk"}
              title={p.asrReady ? (listening ? "Tap to send" : "Tap and speak") : `Speech model missing: ${p.asrSetup}`}
              className={cn(
                "relative grid size-11 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40",
                listening ? "bg-[var(--mood-listening)] text-white" : "bg-secondary text-foreground hover:bg-accent",
              )}
            >
              {listening && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-[var(--mood-listening)]"
                  animate={{ scale: 1 + p.level * 0.6, opacity: 0.35 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              )}
              {p.voiceState === "transcribing" ? <Loader2 className="relative size-5 animate-spin" /> : <Mic className="relative size-5" />}
            </button>
          )}

          <textarea
            ref={box}
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder={
              listening
                ? "Listening…"
                : p.agentName === "Dashi"
                  ? "Ask Dashi anything (e.g. 'account update karo')…"
                  : "Ask Abbas anything…"
            }
            aria-label={p.agentName === "Dashi" ? "Message Dashi" : "Message Abbas"}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground/60"
          />

          <button
            type="button"
            onClick={() => void send()}
            disabled={!text.trim()}
            aria-label="Send"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground transition-opacity disabled:opacity-25"
          >
            <ArrowUp className="size-5" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between px-3 text-[11px] text-muted-foreground/70">
          <span className={cn(p.micError && "text-amber-300")}>
            {p.micError ?? (p.asrReady ? "Enter to send · Shift+Enter for a new line" : `Voice input needs: ${p.asrSetup}`)}
          </span>
          <button type="button" onClick={p.onToggleSpeak} disabled={!p.ttsReady}
                  className="flex items-center gap-1 hover:text-foreground disabled:opacity-50">
            {p.speakReplies && p.ttsReady ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            {p.ttsReady ? (p.speakReplies ? "Voice replies on" : "Voice replies off") : "Voice output unavailable"}
          </button>
        </div>
      </div>
    </div>
  )
}
