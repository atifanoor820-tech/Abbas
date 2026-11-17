"use client"

import { BookMarked, Loader2, Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { api, type Memory } from "@/lib/api"

/** Long-term memories (LangGraph store): shared by every conversation, editable by the user. */
export function MemoryPanel({ memories, backend, onChanged }: { memories: Memory[]; backend: string; onChanged: () => void }) {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <BookMarked className="size-4 text-muted-foreground" /> Long-term memory
        <span className="ml-auto text-[11px] font-normal text-muted-foreground">LangGraph store · {backend}</span>
      </div>
      {memories.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing saved yet. Say “yaad rakho ke …” or “remember that …”.
        </p>
      ) : (
        <ul className="space-y-1">
          {memories.map((m) => (
            <li key={m.id} className="group flex items-start gap-2 text-xs">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-lime-400" />
              <span className="flex-1 break-words">{m.text}</span>
              <button
                type="button"
                aria-label={`Forget: ${m.text}`}
                title="Forget"
                disabled={busy}
                onClick={() => void run(() => api.deleteMemory(m.id))}
                className="text-muted-foreground opacity-60 hover:text-red-300 group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) void run(async () => { await api.addMemory(text.trim()); setText("") })
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a fact, e.g. My website is …"
          className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs"
        />
        <Button size="icon-sm" variant="secondary" type="submit" disabled={busy || !text.trim()} aria-label="Save memory">
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
        </Button>
      </form>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}
