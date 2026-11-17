"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** Push-to-talk microphone capture. The stream is released as soon as recording stops. */
export function useRecorder(maxSeconds: number, onClip: (clip: Blob) => void) {
  const [recording, setRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const raf = useRef<number | null>(null)
  const cancelled = useRef(false)
  const clipHandler = useRef(onClip)
  clipHandler.current = onClip

  const release = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    if (raf.current) cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    setLevel(0)
  }, [])

  const stop = useCallback((discard = false) => {
    cancelled.current = discard
    if (rec.current?.state === "recording") rec.current.stop()
    else release()
  }, [release])

  const start = useCallback(async () => {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      stream.current = s
      const chunks: Blob[] = []
      const r = new MediaRecorder(s)
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      r.onstop = () => {
        setRecording(false)
        release()
        if (!cancelled.current && chunks.length) clipHandler.current(new Blob(chunks, { type: r.mimeType }))
      }
      cancelled.current = false
      r.start()
      rec.current = r
      setRecording(true)
      timer.current = setTimeout(() => stop(), maxSeconds * 1000)

      // Input level meter so the user can see the microphone is live.
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(s).connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!stream.current) return void ctx.close()
        analyser.getByteTimeDomainData(buf)
        let peak = 0
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
        setLevel(Math.min(1, peak / 64))
        raf.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (e) {
      release()
      setError(e instanceof DOMException && e.name === "NotAllowedError"
        ? "Microphone permission was denied."
        : e instanceof DOMException && e.name === "NotFoundError"
          ? "No microphone found."
          : `Microphone error: ${(e as Error).message}`)
    }
  }, [maxSeconds, release, stop])

  useEffect(() => release, [release])

  return { recording, level, error, start, stop }
}
