import { useEffect, useRef } from 'react'
import { CHECKPOINT_COUNT, SUMMIT_HEIGHT } from '../level/greybox'
import { useGameStore } from '../state/gameStore'
import { playerState } from '../state/playerState'

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds - mins * 60
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`
}

export function HUD() {
  const timer = useRef<HTMLSpanElement>(null)
  const height = useRef<HTMLSpanElement>(null)
  const phase = useGameStore((s) => s.phase)
  const checkpoint = useGameStore((s) => s.checkpoint)
  const respawns = useGameStore((s) => s.respawns)
  const bestTime = useGameStore((s) => s.bestTime)
  const finishTime = useGameStore((s) => s.finishTime)
  const newBest = useGameStore((s) => s.newBest)
  const retry = useGameStore((s) => s.retry)

  // Timer and height change every frame, so write them straight to the DOM.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const { startedAt, finishTime: done } = useGameStore.getState()
      const elapsed = done ?? (startedAt === null ? 0 : (performance.now() - startedAt) / 1000)
      if (timer.current) timer.current.textContent = formatTime(elapsed)
      if (height.current) {
        const y = Math.max(0, playerState.position.y)
        height.current.textContent = `${y.toFixed(1)} m / ${SUMMIT_HEIGHT.toFixed(0)} m`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="hud">
      <div className="hud-panel">
        <div className="hud-timer">
          <span ref={timer} />
        </div>
        <div>Best {bestTime === null ? '–' : formatTime(bestTime)}</div>
        <div>
          Height <span ref={height} />
        </div>
        <div>
          Checkpoint {checkpoint} / {CHECKPOINT_COUNT} · Respawns {respawns}
        </div>
      </div>

      {phase === 'finished' && finishTime !== null && (
        <div className="hud-finish">
          <h1>Reached the top</h1>
          <p className="hud-finish-time">{formatTime(finishTime)}</p>
          <p>{newBest ? 'New best time' : `Best ${formatTime(bestTime ?? finishTime)}`}</p>
          <button type="button" onClick={retry}>
            Retry (R)
          </button>
        </div>
      )}

      <div className="hud-panel hud-help">
        WASD / arrows move · Space jump (hold for higher) · Shift sprint · drag to look · wheel to zoom · R restart
      </div>
    </div>
  )
}
