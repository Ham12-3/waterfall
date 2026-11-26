import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { ASSETS } from '../assets'
import { useGameStore } from '../state/gameStore'
import { formatTime } from '../utils/formatTime'

/** Shown until every texture and model the scene needs has loaded. */
function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="screen screen-solid" style={{ backgroundImage: `url(${ASSETS.conceptArt})` }}>
      <div className="screen-card">
        <h1 className="logo">Cascade</h1>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p>Loading {Math.round(progress)}%</p>
      </div>
    </div>
  )
}

function TitleScreen() {
  const play = useGameStore((s) => s.play)
  const bestTime = useGameStore((s) => s.bestTime)
  return (
    <div className="screen screen-solid">
      <video className="screen-video" src={ASSETS.distantWaterfallLoop} poster={ASSETS.conceptArt} autoPlay loop muted playsInline />
      <div className="screen-shade" />
      <div className="screen-card">
        <h1 className="logo">Cascade</h1>
        <p className="tagline">Climb the falls. Beat the clock.</p>
        <button type="button" className="primary" onClick={play} autoFocus>
          Play
        </button>
        {bestTime !== null && <p>Best time {formatTime(bestTime)}</p>}
        <p className="controls">
          WASD / arrows to move · Space to jump (hold for higher) · Shift to sprint · drag the mouse to look
        </p>
      </div>
    </div>
  )
}

function PauseMenu() {
  const resume = useGameStore((s) => s.resume)
  const retry = useGameStore((s) => s.retry)
  const toTitle = useGameStore((s) => s.toTitle)
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)
  return (
    <div className="screen screen-dim">
      <div className="screen-card">
        <h1>Paused</h1>
        <button type="button" className="primary" onClick={resume} autoFocus>
          Resume
        </button>
        <button type="button" onClick={retry}>
          Restart run
        </button>
        <button type="button" onClick={toggleMute}>
          Sound: {muted ? 'off' : 'on'}
        </button>
        <button type="button" onClick={toTitle}>
          Quit to title
        </button>
      </div>
    </div>
  )
}

function FinishScreen() {
  const finishTime = useGameStore((s) => s.finishTime)
  const bestTime = useGameStore((s) => s.bestTime)
  const newBest = useGameStore((s) => s.newBest)
  const respawns = useGameStore((s) => s.respawns)
  const retry = useGameStore((s) => s.retry)
  const toTitle = useGameStore((s) => s.toTitle)
  if (finishTime === null) return null
  return (
    <div className="screen screen-dim">
      <div className="screen-card">
        <h1>Reached the top</h1>
        <p className="finish-time">{formatTime(finishTime)}</p>
        <p>
          {newBest ? 'New best time' : `Best ${formatTime(bestTime ?? finishTime)}`} · {respawns}{' '}
          {respawns === 1 ? 'respawn' : 'respawns'}
        </p>
        <button type="button" className="primary" onClick={retry} autoFocus>
          Retry
        </button>
        <button type="button" onClick={toTitle}>
          Title screen
        </button>
      </div>
    </div>
  )
}

/** Full-screen overlays, plus the keys that drive them (Esc / P pause, M mute). */
export function Screens() {
  const phase = useGameStore((s) => s.phase)
  const { active, progress } = useProgress()
  // Latch: once loading has finished, later lazy loads must not bring the screen back.
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!active && progress >= 100) setLoaded(true)
  }, [active, progress])
  // Nothing to load at all (everything cached or procedural) never reports progress.
  useEffect(() => {
    const timer = setTimeout(() => setLoaded((done) => done || !useProgress.getState().active), 1500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const game = useGameStore.getState()
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (game.phase === 'playing') game.pause()
        else if (game.phase === 'paused') game.resume()
      } else if (e.code === 'KeyM') {
        game.toggleMute()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Losing focus mid-run pauses, so the timer never runs unseen.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) useGameStore.getState().pause()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  if (!loaded) return <LoadingScreen progress={progress} />
  if (phase === 'title') return <TitleScreen />
  if (phase === 'paused') return <PauseMenu />
  if (phase === 'finished') return <FinishScreen />
  return null
}
