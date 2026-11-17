"use client"

import { Menu, OctagonX, PanelRightOpen } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AgentSwitch } from "@/components/agent-switch"
import { AutonomySwitch } from "@/components/autonomy-switch"
import { Composer, type VoiceState } from "@/components/composer"
import { Conversation } from "@/components/conversation"
import { DashiActions } from "@/components/dashi-actions"
import { Drawer } from "@/components/drawer"
import { MemoryPanel } from "@/components/memory-panel"
import { Sidebar } from "@/components/sidebar"
import { Stage } from "@/components/stage"
import { StatusPanel } from "@/components/status-panel"
import { TaskPanel } from "@/components/task-panel"
import { useAvatar } from "@/hooks/use-avatar"
import { useEventStream } from "@/hooks/use-event-stream"
import { useRecorder } from "@/hooks/use-recorder"
import { useSpeechPlayer } from "@/hooks/use-speech-player"
import {
  api, DASHI_ONLY, TERMINAL, type ConversationInfo, type ConversationState, type Memory, type SystemStatus, type Task, type TaskEvent,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const SPEAK_ON = new Set(["task_completed", "task_failed", "task_blocked", "task_cancelled", "approval_required"])
type Panel = "task" | "memory" | "system" | "nav" | null

function mergeEvents(a: TaskEvent[], b: TaskEvent[]): TaskEvent[] {
  const byId = new Map<number, TaskEvent>()
  for (const e of [...a, ...b]) byId.set(e.id, e)
  return [...byId.values()].sort((x, y) => x.id - y.id)
}

export default function Home() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  // Progress events per task, so the chat can show a live checklist (Dashi's per-account steps).
  const [taskEvents, setTaskEvents] = useState<Record<string, TaskEvent[]>>({})
  const fetchedEvents = useRef<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Task | null>(null)
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [notice, setNotice] = useState<string | null>(null)
  const [speakReplies, setSpeakReplies] = useState(true)
  const [panel, setPanel] = useState<Panel>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationInfo[]>([])
  const [convState, setConvState] = useState<ConversationState | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const mine = useRef(new Set<string>())
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const convRef = useRef(conversationId)
  convRef.current = conversationId

  const ttsReady = !!status?.tts.available
  const avatar = useAvatar(voiceState, tasks)
  const player = useSpeechPlayer(() => setVoiceState((v) => (v === "speaking" ? "idle" : v)))

  // --- data loading ------------------------------------------------------------------------------
  const loadStatus = useCallback(async () => {
    try {
      setStatus(await api.status())
      setStatusError(null)
    } catch (e) {
      setStatusError((e as Error).message)
    }
  }, [])
  const loadConversations = useCallback(async () => {
    try { setConversations(await api.conversations()) } catch {}
  }, [])
  const loadConvState = useCallback(async () => {
    const id = convRef.current
    if (!id) return setConvState(null)
    try { setConvState(await api.conversation(id)) } catch { setConvState(null) }
  }, [])
  const loadMemories = useCallback(async () => {
    try { setMemories(await api.memories()) } catch {}
  }, [])
  const loadTasks = useCallback(async () => {
    try {
      const list = await api.tasks(convRef.current)
      setTasks(list)
      // Tasks that have per-account steps: load their events once (the stream only carries new ones).
      for (const t of list) {
        if (fetchedEvents.current.has(t.id) || !t.spec?.plan?.some((st) => st.tool.startsWith("dashi."))) continue
        fetchedEvents.current.add(t.id)
        api.task(t.id).then((full) => {
          if (full.events) setTaskEvents((prev) => ({ ...prev, [t.id]: mergeEvents(full.events ?? [], prev[t.id] ?? []) }))
        }).catch(() => fetchedEvents.current.delete(t.id))
      }
    } catch {}
  }, [])
  const loadDetail = useCallback(async (id: string | null) => {
    if (!id) return setDetail(null)
    try { setDetail(await api.task(id)) } catch { setDetail(null) }
  }, [])

  useEffect(() => {
    try {
      setSpeakReplies(localStorage.getItem("abbas.speak") !== "0")
      setConversationId(localStorage.getItem("abbas.conversation"))
    } catch {}
  }, [])

  useEffect(() => {
    void loadStatus()
    void loadConversations()
    void loadMemories()
    const t = setInterval(loadStatus, 15000)
    return () => clearInterval(t)
  }, [loadStatus, loadConversations, loadMemories])

  useEffect(() => {
    try {
      if (conversationId) localStorage.setItem("abbas.conversation", conversationId)
      else localStorage.removeItem("abbas.conversation")
    } catch {}
    setSelectedId(null)
    void loadTasks()
    void loadConvState()
  }, [conversationId, loadTasks, loadConvState])

  useEffect(() => {
    void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  // --- speech output -----------------------------------------------------------------------------
  const stopSpeaking = useCallback(() => {
    player.stop()
    setVoiceState((v) => (v === "speaking" ? "idle" : v))
  }, [player])

  const say = useCallback(async (text: string) => {
    if (!text.trim()) return
    try {
      const blob = await api.speak(text)
      setVoiceState("speaking")
      await player.play(blob)
    } catch (e) {
      setNotice(`Could not speak the reply: ${(e as Error).message}`)
      setVoiceState("idle")
    }
  }, [player])

  // --- live events -------------------------------------------------------------------------------
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connected = useEventStream(
    useCallback(
      async (e: TaskEvent) => {
        avatar.onEvent(e)
        if (e.type === "progress" || e.type === "tool_started") {
          setTaskEvents((prev) => ({ ...prev, [e.task_id]: mergeEvents(prev[e.task_id] ?? [], [e]) }))
        }
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
        refreshTimer.current = setTimeout(() => void loadTasks(), 120)
        if (e.task_id === selectedRef.current) void loadDetail(e.task_id)
        if (e.type === "task_created") void loadConversations()
        if (e.type === "memory_saved" || e.type === "memory_deleted") void loadMemories()
        if (SPEAK_ON.has(e.type)) void loadConvState()

        if (!mine.current.has(e.task_id) || !SPEAK_ON.has(e.type)) return
        if (e.type !== "approval_required") setVoiceState((v) => (v === "processing" ? "idle" : v))
        if (!speakReplies || !ttsReady) return
        if (e.type === "approval_required") return void say("I need your approval before I continue. " + e.message)
        const t = await api.task(e.task_id).catch(() => null)
        if (t?.result) void say(t.result.split("\n").slice(0, 3).join(". "))
      },
      [avatar, loadDetail, loadTasks, loadConversations, loadMemories, loadConvState, say, speakReplies, ttsReady],
    ),
  )

  // --- actions -----------------------------------------------------------------------------------
  function track(taskId?: string, convId?: string) {
    if (!taskId) return
    mine.current.add(taskId)
    if (convId && convId !== convRef.current) {
      convRef.current = convId
      setConversationId(convId)
    }
    setSelectedId(taskId)
    setVoiceState("processing")
    void loadTasks()
  }

  function selectConversation(id: string | null) {
    setConversationId(id)
    if (id === null) {
      setTasks([])
      setDetail(null)
    }
    setPanel((p) => (p === "nav" ? null : p))
  }

  async function deleteConversation(id: string) {
    try {
      await api.deleteConversation(id)
      const rest = conversations.filter((c) => c.id !== id)
      setConversations(rest)
      if (id === conversationId) selectConversation(rest[0]?.id ?? null)
    } catch (e) {
      setNotice((e as Error).message)
    }
  }

  async function sendText(text: string) {
    setNotice(null)
    const optimisticId = "temp-" + Date.now()
    const optimisticTask: Task = {
      id: optimisticId,
      conversation_id: conversationId,
      request: text,
      source: "text",
      language: "en",
      status: "created",
      spec: null,
      result: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTasks((prev) => [optimisticTask, ...prev.filter((t) => !t.id.startsWith("temp-"))])
    setSelectedId(optimisticId)
    setVoiceState("processing")

    try {
      const r = await api.submit(text, conversationId)
      if (r.stopped) {
        stopSpeaking()
        setNotice(r.stopped.length ? `Stopped ${r.stopped.length} active task(s).` : "Nothing was running.")
      }
      const taskId = r.task_id
      if (!taskId) {
        // A stop command ("ruko") creates no task: drop the placeholder bubble.
        setTasks((prev) => prev.filter((t) => t.id !== optimisticId))
        setVoiceState("idle")
        return
      }
      mine.current.add(taskId)
      const convId = r.conversation_id ?? conversationId
      if (convId && convId !== convRef.current) {
        convRef.current = convId
        setConversationId(convId)
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === optimisticId ? { ...t, id: taskId, conversation_id: convId } : t))
      )
      setSelectedId(taskId)
      void loadTasks()
    } catch (e) {
      setTasks((prev) => prev.filter((t) => t.id !== optimisticId))
      setVoiceState("idle")
      setNotice((e as Error).message)
      throw e
    }
  }

  const recorder = useRecorder(status?.limits.max_recording_s ?? 30, async (clip) => {
    setVoiceState("transcribing")
    try {
      const r = await api.transcribe(clip, true, convRef.current)
      if (r.stopped) {
        stopSpeaking()
        setNotice(`Heard “${r.transcript.text}” — stopped ${r.stopped.length} task(s).`)
        setVoiceState("idle")
      } else if (!r.task_id) {
        setNotice(r.note ?? "I did not catch that.")
        setVoiceState("idle")
      } else {
        setNotice(`Heard (${Math.round(r.transcript.confidence * 100)}% sure): “${r.transcript.text}”`)
        track(r.task_id, r.conversation_id)
      }
    } catch (e) {
      setNotice((e as Error).message)
      setVoiceState("idle")
    }
  })

  useEffect(() => {
    if (recorder.recording) setVoiceState("listening")
  }, [recorder.recording])

  async function emergencyStop() {
    recorder.stop(true)
    stopSpeaking()
    try {
      const r = await api.stopAll()
      setNotice(r.stopped?.length ? `Stopped ${r.stopped.length} task(s).` : "Nothing was running.")
    } catch (e) {
      setNotice((e as Error).message)
    }
    setVoiceState("idle")
  }

  const anyActive = tasks.some((t) => !TERMINAL.includes(t.status))
  const current = conversations.find((c) => c.id === conversationId)
  const agentName = DASHI_ONLY ? "Dashi" : (status?.agent?.name ?? "Abbas")
  const level = voiceState === "listening" ? recorder.level : voiceState === "speaking" ? player.level : 0

  const sidebar = (
    <Sidebar
      mood={avatar.view.mood}
      conversations={conversations}
      currentId={conversationId}
      memoryCount={memories.length}
      status={status}
      connected={connected}
      onSelect={selectConversation}
      onNew={() => selectConversation(null)}
      onDelete={deleteConversation}
      onOpenMemory={() => setPanel("memory")}
      onOpenSystem={() => setPanel("system")}
    />
  )

  return (
    <div className="grid h-dvh lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-border lg:block">{sidebar}</aside>

      <main className="flex min-h-0 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-5">
          <button type="button" onClick={() => setPanel("nav")} aria-label="Open conversations"
                  className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden">
            <Menu className="size-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{current?.title ?? "New conversation"}</h1>
          {statusError && <span className="hidden text-xs text-red-300 sm:inline">Agent service unreachable</span>}
          {!DASHI_ONLY && <AgentSwitch
            value={status?.agent?.active}
            onChange={async (agent) => {
              try {
                await api.switchAgent(agent)
                setNotice(
                  agent === "dashi"
                    ? "Dashi activated: ShowMyTrades multi-profile trading account automation is ready."
                    : "Abbas activated: General desktop, web, and coding assistant.",
                )
                void loadStatus()
              } catch (e) {
                setNotice((e as Error).message)
              }
            }}
          />}
          <AutonomySwitch
            value={status?.actions.autonomy}
            onChange={async (level) => {
              try {
                await api.setAutonomy(level)
                const who = agentName
                setNotice(level === "ask" ? `${who} will ask before changing anything.`
                  : level === "trusted" ? `Trusted: ${who} acts on its own and asks only for hard-to-undo steps.`
                  : `Full autonomy: ${who} won't ask. Use Stop or say “ruko” to halt it.`)
                void loadStatus()
              } catch (e) {
                setNotice((e as Error).message)
              }
            }}
          />
          <button type="button" onClick={() => setPanel("task")} disabled={!detail}
                  className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 sm:flex">
            <PanelRightOpen className="size-4" /> Details
          </button>
          <button
            type="button"
            onClick={emergencyStop}
            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              anyActive || voiceState !== "idle"
                ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/25"
                : "text-muted-foreground hover:bg-accent hover:text-foreground")}
          >
            <OctagonX className="size-4" /> Stop
          </button>
        </header>

        <Stage
          view={avatar.view}
          level={level}
          compact={tasks.length > 0}
          context={convState?.context}
          agentName={agentName}
        />

        <Conversation
          tasks={tasks}
          selected={selectedId}
          agentName={agentName}
          events={taskEvents}
          onSelect={(id) => { setSelectedId(id); setPanel("task") }}
          onSuggest={(s) => void sendText(s)}
        />

        {notice && (
          <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-3 px-6 pb-1 text-xs text-muted-foreground">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="shrink-0 hover:text-foreground">Dismiss</button>
          </div>
        )}

        {(DASHI_ONLY || status?.agent?.active === "dashi") && (
          <DashiActions onSend={sendText} busy={anyActive} />
        )}

        <Composer
          agentName={agentName}
          voiceState={voiceState}
          level={recorder.level}
          asrReady={!!status?.asr.available}
          asrSetup={status?.asr.setup ?? null}
          micError={recorder.error}
          speakReplies={speakReplies}
          ttsReady={ttsReady}
          onToggleSpeak={() => {
            const next = !speakReplies
            setSpeakReplies(next)
            if (!next) stopSpeaking()
            try { localStorage.setItem("abbas.speak", next ? "1" : "0") } catch {}
          }}
          onSend={sendText}
          onMicStart={() => {
            stopSpeaking()
            void recorder.start()
          }}
          onMicStop={() => recorder.stop()}
          onStopSpeaking={stopSpeaking}
        />
      </main>

      <Drawer open={panel === "nav"} onClose={() => setPanel(null)} title="Conversations" side="left" className="max-w-[300px]">
        {sidebar}
      </Drawer>
      <Drawer open={panel === "task"} onClose={() => setPanel(null)} title="Task details">
        <TaskPanel task={detail} onChanged={() => { void loadDetail(selectedId); void loadTasks(); void loadConvState() }} />
      </Drawer>
      <Drawer open={panel === "memory"} onClose={() => setPanel(null)} title="Memory">
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            {agentName} remembers each conversation on its own. These facts are remembered in <em>every</em> conversation.
          </p>
          <MemoryPanel memories={memories} backend={status?.memory.backend ?? "…"} onChanged={() => void loadMemories()} />
        </div>
      </Drawer>
      <Drawer open={panel === "system"} onClose={() => setPanel(null)} title="System">
        <StatusPanel status={status} error={statusError} />
      </Drawer>
    </div>
  )
}
