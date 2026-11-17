"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** Plays Abbas's spoken replies and reports a live 0..1 loudness level for the avatar's mouth. */
export function useSpeechPlayer(onEnd: () => void) {
  const [level, setLevel] = useState(0)
  const ctx = useRef<AudioContext | null>(null)
  const el = useRef<HTMLAudioElement | null>(null)
  const raf = useRef<number | null>(null)
  const endHandler = useRef(onEnd)
  endHandler.current = onEnd

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = null
    if (el.current) {
      el.current.pause()
      URL.revokeObjectURL(el.current.src)
    }
    el.current = null
    setLevel(0)
  }, [])

  const play = useCallback(async (blob: Blob) => {
    stop()
    const audio = new Audio(URL.createObjectURL(blob))
    el.current = audio
    try {
      ctx.current ??= new AudioContext()
      const analyser = ctx.current.createAnalyser()
      analyser.fftSize = 256
      ctx.current.createMediaElementSource(audio).connect(analyser)
      analyser.connect(ctx.current.destination)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (const v of buf) sum += (v - 128) ** 2
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) / 28))
        raf.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // Without Web Audio the reply still plays; the mouth just won't follow it.
    }
    audio.onended = () => {
      stop()
      endHandler.current()
    }
    await audio.play()
  }, [stop])

  useEffect(() => stop, [stop])
  return { level, play, stop }
}
