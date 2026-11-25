import type { KeyboardControlsEntry } from '@react-three/drei'

export type Control = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint' | 'retry'

export const KEY_MAP: KeyboardControlsEntry<Control>[] = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'retry', keys: ['KeyR'] },
]
