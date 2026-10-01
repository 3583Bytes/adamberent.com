import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { getState, setState, useStore } from '../store'
import { Cartridges } from './Cartridges'
import { Chessboard } from './Chessboard'
import { Computer } from './Computer'
import { Desk, Lamp, Mug, Room } from './Decor'
import { Floppy } from './Floppy'
import { IPod } from './IPod'
import { Polaroid } from './Polaroid'
import { Rolodex } from './Rolodex'

const LOOK_AT = new THREE.Vector3(0, 0.8, 0.1)
// Centre of the CRT's glass, and the area to frame when zoomed in on it.
const SCREEN = new THREE.Vector3(0, 0.88, -0.6)
const SCREEN_VIEW = { width: 1.42, height: 1.1 }

// Frames the desk for the current aspect ratio, eases in on load, drifts with the pointer,
// and can be dragged sideways to look around (handy on narrow phones).
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size, pointer, gl } = useThree()
  const intro = useRef(reducedMotion ? 1 : 0)
  const yaw = useRef({ target: 0, current: 0 })
  const look = useRef(LOOK_AT.clone())
  const computerOn = useStore((s) => s.computerOn)

  useEffect(() => {
    const el = gl.domElement
    let startX: number | null = null
    let startYaw = 0
    const down = (e: PointerEvent) => {
      if (getState().computerOn) return
      startX = e.clientX
      startYaw = yaw.current.target
    }
    const move = (e: PointerEvent) => {
      if (startX === null) return
      const dx = (e.clientX - startX) / el.clientWidth
      yaw.current.target = THREE.MathUtils.clamp(startYaw - dx * 1.6, -0.6, 0.6)
    }
    const up = () => {
      startX = null
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl])

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const halfFov = THREE.MathUtils.degToRad(cam.fov / 2)
    const smoothing = 1 - Math.exp(-dt * 4)

    if (computerOn) {
      // Fill the view with the screen, whichever dimension is tighter.
      const fitW = SCREEN_VIEW.width / 2 / (Math.tan(halfFov) * aspect)
      const fitH = SCREEN_VIEW.height / 2 / Math.tan(halfFov)
      const target = SCREEN.clone().add(new THREE.Vector3(0, 0.02, Math.max(fitW, fitH) * 1.04))
      cam.position.lerp(target, smoothing)
      look.current.lerp(SCREEN, smoothing)
      cam.lookAt(look.current)
      yaw.current.target = 0
      return
    }
    // Distance needed to keep roughly 6.4 units of desk visible horizontally.
    const fit = 3.2 / (Math.tan(halfFov) * aspect)
    const dist = THREE.MathUtils.clamp(fit, 6.2, 12)
    intro.current = Math.min(1, intro.current + dt * 0.45)
    const ease = 1 - Math.pow(1 - intro.current, 3)
    const d = dist * (1.35 - 0.35 * ease)
    yaw.current.current = THREE.MathUtils.damp(yaw.current.current, yaw.current.target, 5, dt)
    const drift = reducedMotion ? 0 : 1
    const angle = yaw.current.current + pointer.x * 0.06 * drift
    const flat = d * 0.87
    const target = new THREE.Vector3(Math.sin(angle) * flat, d * 0.5 + pointer.y * 0.2 * drift, Math.cos(angle) * flat)
    cam.position.lerp(target, smoothing)
    // On portrait screens, aim a little higher so the desk sits below the title.
    const lookTarget = LOOK_AT.clone()
    if (aspect < 1) lookTarget.y += 0.4
    look.current.lerp(lookTarget, smoothing)
    cam.lookAt(look.current)
  })
  return null
}

function StatsReporter() {
  const { gl } = useThree()
  const acc = useRef({ frames: 0, time: 0 })
  useFrame((_, dt) => {
    acc.current.frames++
    acc.current.time += dt
    if (acc.current.time >= 0.5) {
      const info = gl.info
      setState({
        stats: {
          fps: Math.round(acc.current.frames / acc.current.time),
          calls: info.render.calls,
          triangles: info.render.triangles,
          geometries: info.memory.geometries,
          textures: info.memory.textures,
        },
      })
      acc.current = { frames: 0, time: 0 }
    }
  })
  return null
}

function WireframeToggle() {
  const wireframe = useStore((s) => s.wireframe)
  const { scene } = useThree()
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.userData.helper) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => {
        ;(m as THREE.MeshStandardMaterial).wireframe = wireframe
      })
    })
  }, [wireframe, scene])
  return null
}

function Spinner({ children }: { children: ReactNode }) {
  const spin = useStore((s) => s.spin)
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    if (spin) ref.current.rotation.y += dt * 0.6
    else ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, Math.round(ref.current.rotation.y / (Math.PI * 2)) * Math.PI * 2, 3, dt)
  })
  return <group ref={ref}>{children}</group>
}

export function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ fov: 34, near: 0.1, far: 60, position: [0, 5, 10] }}
      gl={{ antialias: true }}
      onPointerMissed={() => setState({ inspected: null })}
    >
      <color attach="background" args={['#17110e']} />
      <fog attach="fog" args={['#17110e', 9, 22]} />
      <ambientLight intensity={0.25} color="#ffe8d0" />
      <hemisphereLight args={['#ffe2c0', '#2a1a10', 0.35]} />
      <directionalLight position={[4, 5, 4]} intensity={0.5} color="#cfe0ff" />
      <CameraRig reducedMotion={reducedMotion} />
      <StatsReporter />
      <WireframeToggle />
      <Room />
      <Spinner>
        <Desk />
        <Lamp />
        <Computer />
        <Cartridges />
        <Chessboard />
        <Rolodex />
        <IPod />
        <Floppy />
        <Suspense fallback={null}>
          <Polaroid />
        </Suspense>
        <Mug />
      </Spinner>
    </Canvas>
  )
}
