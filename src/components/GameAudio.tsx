import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { audioEngine } from '../audio/engine'
import { CONFIG } from '../config'
import { WATERFALL } from '../level/greybox'
import { useGameStore } from '../state/gameStore'
import { playerState } from '../state/playerState'

const A = CONFIG.audio

/** Drives the audio engine from game state. Renders nothing. */
export function GameAudio() {
  const phase = useGameStore((s) => s.phase)
  const muted = useGameStore((s) => s.muted)
  const seen = useRef({ splash: playerState.splash.id, landing: playerState.landing.id })

  // Leaving the title screen is always a click or key press, which lets audio start.
  useEffect(() => {
    if (phase !== 'title') audioEngine.start()
  }, [phase])

  useEffect(() => {
    const level = muted || phase === 'title' ? 0 : phase === 'paused' ? A.pausedVolume : A.masterVolume
    audioEngine.setMaster(level)
  }, [phase, muted])

  useFrame(() => {
    // Louder and brighter the closer the player is to the falling sheet.
    const p = playerState.position
    const dx = Math.max(0, Math.abs(p.x) - WATERFALL.width / 2)
    const dz = Math.max(0, p.z - WATERFALL.z)
    const distance = Math.hypot(dx, dz)
    audioEngine.setRoar(1 / (1 + distance / A.roarFalloff))

    const s = seen.current
    if (playerState.splash.id !== s.splash) {
      s.splash = playerState.splash.id
      audioEngine.splash()
    }
    if (playerState.landing.id !== s.landing) {
      s.landing = playerState.landing.id
      audioEngine.land(Math.min(1, playerState.landing.impact / 18), playerState.landing.wet)
    }
  })

  return null
}
