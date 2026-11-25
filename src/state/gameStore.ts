import { create } from 'zustand'

export type GamePhase = 'playing' | 'paused' | 'finished'

const BEST_TIME_KEY = 'cascade.bestTime'

function loadBestTime(): number | null {
  const raw = localStorage.getItem(BEST_TIME_KEY)
  const value = raw === null ? NaN : Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

interface GameState {
  phase: GamePhase
  /** 0 = start, 1..n = checkpoint ledges. */
  checkpoint: number
  respawns: number
  /** performance.now() when the run started, or null before the first move. */
  startedAt: number | null
  /** Final run time in seconds once the summit is reached. */
  finishTime: number | null
  bestTime: number | null
  newBest: boolean
  /** Bumped on retry so the player knows to return to the start. */
  runId: number
  startRun: () => void
  reachCheckpoint: (index: number) => void
  finishRun: () => void
  countRespawn: () => void
  retry: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'playing',
  checkpoint: 0,
  respawns: 0,
  startedAt: null,
  finishTime: null,
  bestTime: loadBestTime(),
  newBest: false,
  runId: 0,
  startRun: () => {
    if (get().startedAt === null && get().phase === 'playing') set({ startedAt: performance.now() })
  },
  reachCheckpoint: (index) => {
    if (index > get().checkpoint) set({ checkpoint: index })
  },
  finishRun: () => {
    const { startedAt, phase, bestTime } = get()
    if (phase !== 'playing' || startedAt === null) return
    const finishTime = (performance.now() - startedAt) / 1000
    const newBest = bestTime === null || finishTime < bestTime
    if (newBest) localStorage.setItem(BEST_TIME_KEY, String(finishTime))
    set({ phase: 'finished', finishTime, newBest, bestTime: newBest ? finishTime : bestTime })
  },
  countRespawn: () => set((s) => ({ respawns: s.respawns + 1 })),
  retry: () =>
    set((s) => ({
      phase: 'playing',
      checkpoint: 0,
      respawns: 0,
      startedAt: null,
      finishTime: null,
      newBest: false,
      runId: s.runId + 1,
    })),
}))
