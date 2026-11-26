import { useEffect, useRef } from 'react'
import { CHECKPOINT_COUNT, SUMMIT_HEIGHT } from '../level/greybox'
import { runClock, useGameStore } from '../state/gameStore'
import { playerState } from '../state/playerState'
import { formatTime } from '../utils/formatTime'

/** In-game readout: timer, best time, height and checkpoint progress. */
export function HUD() {
  const timer = useRef<HTMLSpanElement>(null)
  const height = useRef<HTMLSpanElement>(null)
  const phase = useGameStore((s) => s.phase)
  const checkpoint = useGameStore((s) => s.checkpoint)
  const respawns = useGameStore((s) => s.respawns)
  const bestTime = useGameStore((s) => s.bestTime)
  const muted = useGameStore((s) => s.muted)

  // Timer and height change every frame, so write them straight to the DOM.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (timer.current) timer.current.textContent = formatTime(runClock.time)
      if (height.current) {
        const y = Math.max(0, playerState.position.y)
        height.current.textContent = `${y.toFixed(1)} m / ${SUMMIT_HEIGHT.toFixed(0)} m`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  if (phase === 'title') return null

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
      <div className="hud-panel hud-help">
        WASD / arrows move · Space jump · Shift sprint · drag to look · Esc pause · R restart · M{' '}
        {muted ? 'unmute' : 'mute'}
      </div>
    </div>
  )
}
