import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { FONT_RETRO, useCanvasTexture, useWoodTexture } from './textures'

export function Desk() {
  const wood = useWoodTexture()
  const top = useMemo(() => {
    const t = wood.clone()
    t.repeat.set(2, 1)
    t.needsUpdate = true
    return t
  }, [wood])

  return (
    <group>
      <mesh position={[0, -0.07, 0.2]} receiveShadow>
        <boxGeometry args={[8, 0.14, 4]} />
        <meshStandardMaterial map={top} roughness={0.62} />
      </mesh>
    </group>
  )
}

export function Room() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 3, -4.8]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshStandardMaterial color="#2a211c" roughness={0.95} />
      </mesh>
      {/* Floor, far below, so the desk edge doesn't fall into a void */}
      <mesh position={[0, -2.5, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#120e0c" roughness={1} />
      </mesh>
    </group>
  )
}

export function Mug() {
  const label = useCanvasTexture(512, 128, (c, w, h) => {
    c.fillStyle = '#25408f'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#e6ecff'
    c.font = `72px ${FONT_RETRO}`
    c.textBaseline = 'middle'
    c.textAlign = 'center'
    c.fillText('READY.', 240, h / 2 + 4)
    c.fillRect(338, 34, 30, 58)
  })
  return (
    <group position={[-1.15, 0, 1.2]} rotation={[0, Math.PI + 0.35, 0]}>
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.11, 0.26, 40, 1, true]} />
        <meshStandardMaterial map={label} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.01, 40]} />
        <meshStandardMaterial color="#25408f" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.112, 40]} />
        <meshStandardMaterial color="#3b2014" roughness={0.15} />
      </mesh>
      <mesh position={[0.135, 0.13, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.06, 0.016, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#25408f" roughness={0.35} />
      </mesh>
    </group>
  )
}

// Desk lamp that also provides the scene's warm key light.
export function Lamp() {
  const light = useRef<THREE.SpotLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    target.position.set(0.6, 0, 0.4)
    if (light.current) light.current.target = target
  }, [target])

  const metal = <meshStandardMaterial color="#1f3b2f" roughness={0.35} metalness={0.6} />
  return (
    <group position={[-3.0, 0, -1.15]}>
      <primitive object={target} />
      <mesh position={[0, 0.025, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.05, 32]} />
        {metal}
      </mesh>
      <mesh position={[0.12, 0.6, 0.05]} rotation={[0, 0, -0.35]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.25, 12]} />
        {metal}
      </mesh>
      <group position={[0.4, 1.2, 0.18]} rotation={[0.35, 0, -0.95]}>
        <mesh castShadow>
          <coneGeometry args={[0.2, 0.32, 32, 1, true]} />
          <meshStandardMaterial color="#1f3b2f" roughness={0.35} metalness={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshBasicMaterial color="#fff2cf" toneMapped={false} />
        </mesh>
      </group>
      <spotLight
        ref={light}
        position={[0.55, 1.1, 0.3]}
        color="#ffd9a0"
        intensity={38}
        angle={0.9}
        penumbra={0.75}
        distance={9}
        decay={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </group>
  )
}
