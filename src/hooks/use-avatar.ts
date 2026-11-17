"use client"

import {
  AppWindow, BookMarked, Brain, Code2, FileText, FolderPlus, Globe, Keyboard, ListChecks, Mic, MousePointerClick,
  ScanEye, Search, ShieldQuestion, Sparkles, SquareTerminal, Volume2, Zap, type LucideIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { AvatarMood } from "@/components/avatar/abbas-avatar"
import type { VoiceState } from "@/components/composer"
import { TERMINAL, type Task, type TaskEvent } from "@/lib/api"

export interface AvatarView {
  mood: AvatarMood
  icon: LucideIcon | null
  title: string
  detail: string
}

const TOOL_VIEW: Record<string, { icon: LucideIcon; title: string }> = {
  "browser.open": { icon: Globe, title: "Opening a page" },
  "browser.click": { icon: Globe, title: "Clicking in the browser" },
  "browser.type": { icon: Keyboard, title: "Typing in the browser" },
  "browser.read": { icon: Globe, title: "Reading the page" },
  "browser.inspect": { icon: Globe, title: "Inspecting a website" },
  "desktop.launch_app": { icon: AppWindow, title: "Opening an app" },
  "desktop.click": { icon: MousePointerClick, title: "Clicking in an app" },
  "desktop.type": { icon: Keyboard, title: "Typing in an app" },
  "desktop.read_window": { icon: AppWindow, title: "Reading a window" },
  "desktop.list_windows": { icon: AppWindow, title: "Looking at open windows" },
  "screen.click": { icon: ScanEye, title: "Clicking on screen" },
  "screen.type": { icon: Keyboard, title: "Typing" },
  "screen.hotkey": { icon: Keyboard, title: "Pressing keys" },
  "screen.screenshot": { icon: ScanEye, title: "Looking at the screen" },
  "workspace.list": { icon: FileText, title: "Checking files" },
  "workspace.read": { icon: FileText, title: "Reading a file" },
  "workspace.write": { icon: FileText, title: "Writing a file" },
  "coding.check_executors": { icon: Code2, title: "Checking coding tools" },
  "web.search": { icon: Search, title: "Searching the web" },
  "web.read": { icon: Globe, title: "Reading a website" },
  "research.brief": { icon: Search, title: "Researching" },
  "files.make_folder": { icon: FolderPlus, title: "Creating a folder" },
  "terminal.run": { icon: SquareTerminal, title: "Running a command" },
  "code.write": { icon: Code2, title: "Writing code" },
  "ide.open": { icon: AppWindow, title: "Opening Antigravity" },
}

const IDLE: AvatarView = { mood: "idle", icon: null, title: "Ready", detail: "Type or tap the mic — English, Urdu or Roman Urdu." }

function short(text: string, n = 90) {
  const t = text.replace(/\s+/g, " ").trim()
  return t.length > n ? t.slice(0, n - 1) + "…" : t
}

/** Turns voice state + the live event stream into what the avatar should show. */
export function useAvatar(voiceState: VoiceState, tasks: Task[]) {
  const [work, setWork] = useState<AvatarView | null>(null)
  const [flash, setFlash] = useState<AvatarView | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEvent = useCallback((e: TaskEvent) => {
    const d = e.data ?? {}
    let next: AvatarView | null | undefined
    switch (e.type) {
      case "task_created":
      case "planning_started":
        next = { mood: "thinking", icon: Brain, title: "Thinking", detail: "Understanding your request…" }
        break
      case "intent_resolved":
        next = { mood: "thinking", icon: Brain, title: "Planning", detail: short(e.message) }
        break
      case "decision_made": {
        const engine = String(d.engine ?? "")
        const purpose = String(d.purpose ?? "decision")
        next = {
          mood: "thinking", icon: Zap,
          title: engine === "jev" ? "Jev is deciding" : engine === "gemini" ? "Gemini is deciding" : "Deciding",
          detail: purpose === "risk" ? "Checking whether this step is safe…" : short(e.message.split("→").pop() ?? e.message),
        }
        break
      }
      case "tool_started": {
        const view = TOOL_VIEW[String(d.tool)] ?? { icon: Sparkles, title: "Working" }
        next = { mood: "acting", icon: view.icon, title: view.title, detail: short(e.message) }
        break
      }
      case "tool_output": {
        const last = e.message.split("\n").filter((l) => l.trim()).pop() ?? ""
        next = { mood: "acting", icon: SquareTerminal, title: "Running a command", detail: short(last) }
        break
      }
      case "research_started":
        next = { mood: "acting", icon: Search, title: "Researching", detail: short(e.message) }
        break
      case "review_completed":
        next = { mood: "thinking", icon: ListChecks, title: "Checking progress", detail: short(e.message) }
        break
      case "memory_saved":
        next = { mood: "thinking", icon: BookMarked, title: "Remembering", detail: short(e.message) }
        break
      case "approval_required":
        next = { mood: "waiting", icon: ShieldQuestion, title: "Needs your OK", detail: short(e.message) }
        break
      case "task_completed":
      case "task_failed":
      case "task_blocked":
      case "task_cancelled": {
        const good = e.type === "task_completed"
        const view: AvatarView = {
          mood: good ? "success" : e.type === "task_cancelled" ? "idle" : "error",
          icon: null,
          title: good ? "Done" : e.type === "task_blocked" ? "Need a bit more" : e.type === "task_cancelled" ? "Stopped" : "Couldn't finish",
          detail: short(e.message.split("\n").find((l) => l.trim() && !/^(Done\.|Incomplete)/.test(l)) ?? e.message),
        }
        next = null
        setFlash(view)
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlash(null), 4000)
        break
      }
    }
    if (next !== undefined) setWork(next)
  }, [])

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  const active = tasks.find((t) => !TERMINAL.includes(t.status))
  let view: AvatarView
  if (voiceState === "listening") view = { mood: "listening", icon: Mic, title: "Listening", detail: "Speak now — tap the mic again to send." }
  else if (voiceState === "transcribing") view = { mood: "thinking", icon: Mic, title: "Transcribing", detail: "Turning your voice into text…" }
  else if (voiceState === "speaking") view = { mood: "speaking", icon: Volume2, title: "Speaking", detail: flash?.detail ?? "" }
  else if (active?.status === "awaiting_approval") view = work?.mood === "waiting" ? work : { mood: "waiting", icon: ShieldQuestion, title: "Needs your OK", detail: active.spec?.approval_reason ?? "" }
  else if (active && work) view = work
  else if (active) view = { mood: "thinking", icon: Brain, title: "Thinking", detail: short(active.request) }
  else view = flash ?? IDLE

  return { view, onEvent }
}
