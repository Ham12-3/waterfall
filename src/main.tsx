import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { audioEngine } from './audio/engine'
import { runClock, useGameStore } from './state/gameStore'
import { playerState } from './state/playerState'
import './styles.css'

if (import.meta.env.DEV) {
  // Handy in the browser console while developing.
  Object.assign(window, { __cascade: { playerState, useGameStore, runClock, audioEngine } })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
