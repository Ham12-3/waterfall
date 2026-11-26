import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Leva } from 'leva'
import { lazy, Suspense } from 'react'
import { CameraRig } from './components/CameraRig'
import { DevStats } from './components/DevStats'
import { GameAudio } from './components/GameAudio'
import { HUD } from './components/HUD'
import { Level } from './components/Level'
import { Logs } from './components/Logs'
import { Player } from './components/Player'
import { Screens } from './components/Screens'
import { Sky } from './components/Sky'
import { Splash } from './components/Splash'
import { Waterfall } from './components/waterfall/Waterfall'
import { CONFIG } from './config'
import { KEY_MAP } from './input/controls'
import { useGameStore } from './state/gameStore'

// Post-processing is a large library and not needed for the first frame, so it
// loads as its own chunk once the game is already on screen.
const PostFX = lazy(() => import('./components/PostFX').then((m) => ({ default: m.PostFX })))

export default function App() {
  // The world only moves while a run is in progress or just finished.
  const frozen = useGameStore((s) => s.phase === 'title' || s.phase === 'paused')

  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: CONFIG.camera.fov, near: 0.1, far: 400 }}>
        <color attach="background" args={[CONFIG.fog.color]} />
        <fog attach="fog" args={[CONFIG.fog.color, CONFIG.fog.near, CONFIG.fog.far]} />
        <hemisphereLight args={['#dfe9f2', '#55595e', 0.9]} />
        <directionalLight
          position={CONFIG.sunPosition}
          intensity={2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={30}
          shadow-camera-bottom={-10}
          shadow-camera-far={80}
        />
        <Suspense fallback={null}>
          <Physics gravity={[0, CONFIG.physics.gravity, 0]} paused={frozen}>
            <Level />
            <Logs />
            <Player />
            <CameraRig />
          </Physics>
        </Suspense>
        <Suspense fallback={null}>
          <Sky />
          <Splash />
          <Waterfall />
        </Suspense>
        <GameAudio />
        <Suspense fallback={null}>
          <PostFX />
        </Suspense>
        {import.meta.env.DEV && <DevStats />}
      </Canvas>
      <HUD />
      <Screens />
      <Leva hidden={!import.meta.env.DEV} collapsed />
    </KeyboardControls>
  )
}
