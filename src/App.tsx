import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Suspense } from 'react'
import { CameraRig } from './components/CameraRig'
import { HUD } from './components/HUD'
import { Level } from './components/Level'
import { Player } from './components/Player'
import { Splash } from './components/Splash'
import { CONFIG } from './config'
import { KEY_MAP } from './input/controls'

export default function App() {
  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: CONFIG.camera.fov, near: 0.1, far: 400 }}
      >
        <color attach="background" args={['#aab8c2']} />
        <fog attach="fog" args={['#aab8c2', 40, 140]} />
        <hemisphereLight args={['#dfe9f2', '#55595e', 0.9]} />
        <directionalLight
          position={[12, 30, 14]}
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
          <Physics gravity={[0, CONFIG.physics.gravity, 0]}>
            <Level />
            <Player />
            <CameraRig />
          </Physics>
        </Suspense>
        <Splash />
      </Canvas>
      <HUD />
    </KeyboardControls>
  )
}
