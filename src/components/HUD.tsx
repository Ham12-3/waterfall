import { useEffect, useRef } from 'react'
import { SUMMIT_HEIGHT } from '../level/greybox'
import { useGameStore } from '../state/gameStore'
import { playerState } from '../state/playerState'

export function HUD() {
  const readout = useRef<HTMLSpanElement>(null)
  const respawns = useGameStore((s) => s.respawns)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (readout.current) {
        const height = Math.max(0, playerState.position.y)
        readout.current.textContent = `${height.toFixed(1)} m / ${SUMMIT_HEIGHT.toFixed(0)} m`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="hud">
      <div className="hud-panel">
        <strong>Cascade</strong> · grey box test
        <div>
          Height <span ref={readout} /> · Respawns {respawns}
        </div>
      </div>
      <div className="hud-panel hud-help">
        WASD / arrows move · Space jump (hold for higher) · Shift sprint · drag mouse to orbit
      </div>
    </div>
  )
}
