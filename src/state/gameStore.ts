import { create } from 'zustand'

export type GamePhase = 'playing' | 'paused' | 'finished'

interface GameState {
  phase: GamePhase
  respawns: number
  setPhase: (phase: GamePhase) => void
  countRespawn: () => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'playing',
  respawns: 0,
  setPhase: (phase) => set({ phase }),
  countRespawn: () => set((s) => ({ respawns: s.respawns + 1 })),
}))
