import { create } from 'zustand'

export type GamePhase = 'title' | 'playing' | 'paused' | 'finished'

const BEST_TIME_KEY = 'cascade.bestTime'
const MUTED_KEY = 'cascade.muted'

function loadBestTime(): number | null {
  const raw = localStorage.getItem(BEST_TIME_KEY)
  const value = raw === null ? NaN : Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * The run timer. Kept outside the store because it changes every frame;
 * Player advances it only while the game is being played, so pausing is free.
 */
export const runClock = {
  /** Seconds elapsed in the current run. */
  time: 0,
  /** False until the player first moves. */
  started: false,
}

interface GameState {
  phase: GamePhase
  /** 0 = start, 1..n = checkpoint ledges. */
  checkpoint: number
  respawns: number
  /** Final run time in seconds once the summit is reached. */
  finishTime: number | null
  bestTime: number | null
  newBest: boolean
  muted: boolean
  /** Bumped whenever the player must be sent back to the start. */
  runId: number
  play: () => void
  pause: () => void
  resume: () => void
  reachCheckpoint: (index: number) => void
  finishRun: () => void
  countRespawn: () => void
  retry: () => void
  toTitle: () => void
  toggleMute: () => void
}

const freshRun = { checkpoint: 0, respawns: 0, finishTime: null, newBest: false }

function resetClock() {
  runClock.time = 0
  runClock.started = false
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',
  ...freshRun,
  bestTime: loadBestTime(),
  muted: localStorage.getItem(MUTED_KEY) === '1',
  runId: 0,
  play: () => {
    if (get().phase === 'title') set({ phase: 'playing' })
  },
  pause: () => {
    if (get().phase === 'playing') set({ phase: 'paused' })
  },
  resume: () => {
    if (get().phase === 'paused') set({ phase: 'playing' })
  },
  reachCheckpoint: (index) => {
    if (index > get().checkpoint) set({ checkpoint: index })
  },
  finishRun: () => {
    const { phase, bestTime } = get()
    if (phase !== 'playing' || !runClock.started) return
    const finishTime = runClock.time
    const newBest = bestTime === null || finishTime < bestTime
    if (newBest) localStorage.setItem(BEST_TIME_KEY, String(finishTime))
    set({ phase: 'finished', finishTime, newBest, bestTime: newBest ? finishTime : bestTime })
  },
  countRespawn: () => set((s) => ({ respawns: s.respawns + 1 })),
  retry: () => {
    resetClock()
    set((s) => ({ ...freshRun, phase: 'playing', runId: s.runId + 1 }))
  },
  toTitle: () => {
    resetClock()
    set((s) => ({ ...freshRun, phase: 'title', runId: s.runId + 1 }))
  },
  toggleMute: () => {
    const muted = !get().muted
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
    set({ muted })
  },
}))
