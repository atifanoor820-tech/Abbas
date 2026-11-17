// Abbas is switched off for now: the dashboard shows only Dashi. Set NEXT_PUBLIC_DASHI_ONLY=0 to bring Abbas back.
export const DASHI_ONLY = process.env.NEXT_PUBLIC_DASHI_ONLY !== "0"

// Backend URL, hardcoded on purpose (no .env). Change this line to point at another backend,
// e.g. "http://127.0.0.1:8000" for a local one.
export const API = "https://backed-nv85.vercel.app"

export type TaskStatus =
  | "created"
  | "running"
  | "awaiting_approval"
  | "blocked"
  | "cancelled"
  | "completed"
  | "failed"

export interface PlanStep {
  tool: string
  args: Record<string, unknown>
  description: string
  risk: "low" | "medium" | "high"
}

export interface TaskSpec {
  original_request: string
  normalized_request: string
  language: string
  interpreted_objective: string
  target: string | null
  required_outcome: string
  plan: PlanStep[]
  risk_level: "low" | "medium" | "high"
  requires_approval: boolean
  approval_reason: string | null
  clarification_question: string | null
  reply: string | null
  interpreter: "rules" | "llm"
}

export interface TaskEvent {
  id: number
  task_id: string
  type: string
  message: string
  data: Record<string, unknown> | null
  created_at: string
}

export interface ConversationInfo {
  id: string
  title: string
  updated_at: string
  tasks: number
}

export interface ConversationState {
  id: string
  title: string
  history: { role: "user" | "assistant"; content: string; task_id: string }[]
  context: { surface?: string; url?: string; page_title?: string; window?: string; app?: string; file?: string; folder?: string }
}

export type Autonomy = "ask" | "trusted" | "full"

export interface RuntimeSettings {
  autonomy: Autonomy
  app_access: "all" | "selected"
  screen_actions: boolean
  browser_headless: boolean
  allow_any_app: boolean
  extra_folders: string[]
}

export interface SettingsView {
  editable: RuntimeSettings
  fixed: {
    workspaces: string[]
    browser_channel: string
    gemini_model: string | null
    jev_model: string | null
    database: "postgres" | "sqlite"
    asr_model: string
    tts_voice: string
    speech_summary?: string
  }
}

export interface DesktopApp {
  id: string
  name: string
  source: "allowlist" | "start_menu"
  command: string | null
  allowed: boolean
}

export interface AppsView {
  access: "all" | "selected"
  any_app: boolean
  allowed: number
  total: number
  apps: DesktopApp[]
}

export interface Memory {
  id: string
  text: string
  created_at: string
  task_id: string | null
}

export interface Task {
  id: string
  conversation_id: string | null
  request: string
  source: "text" | "voice"
  language: string
  status: TaskStatus
  spec: TaskSpec | null
  result: string | null
  created_at: string
  updated_at: string
  events?: TaskEvent[]
}

export interface EngineStatus {
  engine: string
  available: boolean
  setup: string | null
  [k: string]: unknown
}

export interface DashiProfile {
  id: string
  name: string
  email: string
  password?: string
  profile_url: string
  notes?: string
}

export interface DashiTradingAccount {
  id: string
  name: string
  account_number: string
  broker: string
  server: string
  platform: string
  login: string
  password?: string
  notes?: string
  profile_id?: string
}

export interface DashiImportResult {
  found: number
  added: string[]
  updated: string[]
  config: DashiConfig
}

export interface DashiConfig {
  active_agent: "abbas" | "dashi"
  profiles: DashiProfile[]
  trading_accounts: DashiTradingAccount[]
}

export interface SystemStatus {
  agent?: { name: string; nickname: string; active?: "abbas" | "dashi"; dashi_only?: boolean }
  reasoning: { mode: "gemini" | "llm" | "rules"; model: string | null }
  reflex: { engine: "jev" | "gemini" | "local"; model: string | null; min_confidence: number; images: boolean }
  actions: { browser_headless: boolean; screen_actions: boolean; autonomy: Autonomy; any_app: boolean }
  memory: { backend: "postgres" | "sqlite"; database: "postgres" | "sqlite"; saved: number }
  asr: EngineStatus
  tts: EngineStatus
  workspaces: string[]
  allowed_apps: string[]
  tools: { name: string; description: string; risk: string }[]
  limits: { max_steps: number; tool_timeout_s: number; max_recording_s: number; asr_min_confidence: number }
}

export interface Transcript {
  text: string
  language: string | null
  language_probability: number | null
  confidence: number
  duration_s: number
  elapsed_s: number
}

export interface SubmitResult {
  task_id?: string
  conversation_id?: string
  stopped?: string[]
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init)
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {}
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail))
  }
  return res.json() as Promise<T>
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

export const api = {
  status: () => req<SystemStatus>("/api/status"),
  tasks: (conversationId: string | null) =>
    conversationId ? req<Task[]>(`/api/tasks?limit=60&conversation_id=${conversationId}`) : Promise.resolve([] as Task[]),
  task: (id: string) => req<Task>(`/api/tasks/${id}`),
  submit: (text: string, conversationId: string | null) =>
    req<SubmitResult>("/api/tasks", json({ text, conversation_id: conversationId })),
  conversations: () => req<ConversationInfo[]>("/api/conversations"),
  newConversation: () => req<ConversationInfo>("/api/conversations", { method: "POST" }),
  conversation: (id: string) => req<ConversationState>(`/api/conversations/${id}`),
  deleteConversation: (id: string) => req(`/api/conversations/${id}`, { method: "DELETE" }),
  settings: () => req<SettingsView>("/api/settings"),
  updateSettings: (changes: Partial<RuntimeSettings>) =>
    req<SettingsView>("/api/settings", { ...json(changes), method: "PATCH" }),
  apps: () => req<AppsView>("/api/apps"),
  setApps: (rules: Record<string, boolean>) => req("/api/apps", { ...json({ rules }), method: "PUT" }),
  setAutonomy: (level: Autonomy) =>
    req<{ level: Autonomy }>("/api/settings/autonomy", { ...json({ level }), method: "PUT" }),
  memories: () => req<Memory[]>("/api/memories"),
  addMemory: (text: string) => req<Memory>("/api/memories", json({ text })),
  deleteMemory: (id: string) => req(`/api/memories/${id}`, { method: "DELETE" }),
  approve: (id: string, approved: boolean) => req(`/api/tasks/${id}/approve`, json({ approved })),
  cancel: (id: string) => req(`/api/tasks/${id}/cancel`, { method: "POST" }),
  stopAll: () => req<SubmitResult>("/api/stop", { method: "POST" }),
  remove: (id: string) => req(`/api/tasks/${id}`, { method: "DELETE" }),
  transcribe: (audio: Blob, submit: boolean, conversationId: string | null) => {
    const fd = new FormData()
    const ext = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "m4a" : "webm"
    fd.append("audio", audio, `clip.${ext}`)
    fd.append("submit", String(submit))
    if (conversationId) fd.append("conversation_id", conversationId)
    return req<{ transcript: Transcript; language_guess: string; note?: string } & SubmitResult>(
      "/api/voice/transcribe",
      { method: "POST", body: fd },
    )
  },
  speak: async (text: string): Promise<Blob> => {
    const res = await fetch(`${API}/api/voice/speak`, json({ text }))
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? "speech failed")
    return res.blob()
  },
  screenshotUrl: (name: string) => `${API}/api/screenshots/${name}`,
  getDashi: () => req<DashiConfig>("/api/dashi"),
  updateDashi: (cfg: Partial<DashiConfig>) =>
    req<DashiConfig>("/api/dashi", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) }),
  importDashiAccounts: (text: string) => req<DashiImportResult>("/api/dashi/accounts/import", json({ text })),
  switchAgent: (agent: "abbas" | "dashi") =>
    req<{ active_agent: "abbas" | "dashi" }>("/api/dashi/switch", json({ agent })),
}

export const TERMINAL: TaskStatus[] = ["blocked", "cancelled", "completed", "failed"]
