"use client"

import { useEffect, useRef, useState } from "react"
import { API, type TaskEvent } from "@/lib/api"

/** Subscribes to the agent's persisted event log over SSE. EventSource reconnects on its own. */
export function useEventStream(onEvent: (e: TaskEvent) => void) {
  const [connected, setConnected] = useState(false)
  const handler = useRef(onEvent)
  handler.current = onEvent

  useEffect(() => {
    const es = new EventSource(`${API}/api/events/stream`)
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.addEventListener("task_event", (msg) => {
      handler.current(JSON.parse((msg as MessageEvent).data) as TaskEvent)
    })
    return () => es.close()
  }, [])

  return connected
}
