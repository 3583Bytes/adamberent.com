import { useMemo } from 'react'
import * as THREE from 'three'
import { links } from '../content'
import { FONT_RETRO, useCanvasTexture } from './textures'
import { Interactive } from './Interactive'

const SQ = 0.15
type Kind = 'p' | 'r' | 'n' | 'b' | 'q' | 'k'

// A quiet middlegame. Uppercase is white, lowercase black, keyed by square.
const POSITION: Record<string, string> = {
  g1: 'K', f1: 'R', d1: 'Q', c3: 'N', e3: 'B', f2: 'P', g2: 'P', h2: 'P', e4: 'P', d4: 'P', a2: 'P', b3: 'P',
  g8: 'k', f8: 'r', d8: 'q', f6: 'n', e7: 'b', f7: 'p', g7: 'p', h6: 'p', e5: 'p', d6: 'p', a7: 'p', b6: 'p',
}

const v = (r: number, y: number) => new THREE.Vector2(r, y)

function bodyProfile(height: number, top: number) {
  return [v(0, 0), v(0.055, 0), v(0.056, 0.012), v(0.045, 0.022), v(0.042, 0.03), v(top, height * 0.8), v(top * 1.5, height * 0.86), v(top * 1.2, height), v(0, height)]
}

function usePieceGeometries() {
  return useMemo(() => {
    const lathe = (pts: THREE.Vector2[]) => new THREE.LatheGeometry(pts, 24)
    return {
      pBody: lathe(bodyProfile(0.08, 0.018)),
      rBody: lathe([v(0, 0), v(0.058, 0), v(0.058, 0.014), v(0.045, 0.026), v(0.036, 0.1), v(0.045, 0.11), v(0.045, 0.145), v(0, 0.145)]),
      nBody: lathe(bodyProfile(0.07, 0.026)),
      bBody: lathe(bodyProfile(0.11, 0.018)),
      qBody: lathe(bodyProfile(0.15, 0.02)),
      kBody: lathe(bodyProfile(0.165, 0.022)),
      sphere: new THREE.SphereGeometry(1, 20, 14),
    }
  }, [])
}

function Piece({ kind, white, geo }: { kind: Kind; white: boolean; geo: ReturnType<typeof usePieceGeometries> }) {
  const mat = (
    <meshStandardMaterial color={white ? '#efe6d2' : '#2b2420'} roughness={0.32} metalness={0.05} />
  )
  const facing = white ? Math.PI : 0
  switch (kind) {
    case 'p':
      return (
        <group>
          <mesh geometry={geo.pBody} castShadow>{mat}</mesh>
          <mesh geometry={geo.sphere} position={[0, 0.1, 0]} scale={0.026} castShadow>{mat}</mesh>
        </group>
      )
    case 'r':
      return <mesh geometry={geo.rBody} castShadow>{mat}</mesh>
    case 'n':
      return (
        <group rotation={[0, facing, 0]}>
          <mesh geometry={geo.nBody} castShadow>{mat}</mesh>
          <mesh position={[0, 0.11, 0.008]} rotation={[0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.04, 0.085, 0.05]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.135, 0.04]} rotation={[0.9, 0, 0]} castShadow>
            <boxGeometry args={[0.036, 0.03, 0.06]} />
            {mat}
          </mesh>
        </group>
      )
    case 'b':
      return (
        <group>
          <mesh geometry={geo.bBody} castShadow>{mat}</mesh>
          <mesh geometry={geo.sphere} position={[0, 0.135, 0]} scale={[0.028, 0.04, 0.028]} castShadow>{mat}</mesh>
          <mesh geometry={geo.sphere} position={[0, 0.18, 0]} scale={0.01} castShadow>{mat}</mesh>
        </group>
      )
    case 'q':
      return (
        <group>
          <mesh geometry={geo.qBody} castShadow>{mat}</mesh>
          <mesh position={[0, 0.165, 0]} castShadow>
            <cylinderGeometry args={[0.036, 0.024, 0.03, 12]} />
            {mat}
          </mesh>
          <mesh geometry={geo.sphere} position={[0, 0.19, 0]} scale={0.014} castShadow>{mat}</mesh>
        </group>
      )
    case 'k':
      return (
        <group>
          <mesh geometry={geo.kBody} castShadow>{mat}</mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.014, 0.06, 0.014]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.205, 0]} castShadow>
            <boxGeometry args={[0.04, 0.014, 0.014]} />
            {mat}
          </mesh>
        </group>
      )
  }
}

export function Chessboard() {
  const geo = usePieceGeometries()
  const squares = useCanvasTexture(1024, 1024, (c, w) => {
    const s = w / 8
    for (let f = 0; f < 8; f++)
      for (let r = 0; r < 8; r++) {
        c.fillStyle = (f + r) % 2 === 0 ? '#e8d6b0' : '#7a5435'
        c.fillRect(f * s, r * s, s, s)
      }
  })
  const frame = useCanvasTexture(1024, 64, (c, w, h) => {
    c.fillStyle = '#3b2618'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#c9b48a'
    c.font = `44px ${FONT_RETRO}`
    c.textBaseline = 'middle'
    c.textAlign = 'center'
    'ABCDEFGH'.split('').forEach((ch, i) => c.fillText(ch, (w * 0.0625) + (i + 0.5) * (w * 0.875) / 8, h / 2 + 2))
  })

  const pieces = Object.entries(POSITION).map(([sq, p]) => {
    const file = sq.charCodeAt(0) - 97
    const rank = Number(sq[1]) - 1
    return { key: sq, x: (file - 3.5) * SQ, z: (3.5 - rank) * SQ, kind: p.toLowerCase() as Kind, white: p === p.toUpperCase() }
  })

  const size = SQ * 8
  return (
    <Interactive
      name="Chessboard"
      title={links.chess.label}
      blurb={links.chess.blurb}
      url={links.chess.url}
      position={[2.15, 0, -0.15]}
      rotation={[0, -0.38, 0]}
      lift={0.05}
    >
      <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
        <boxGeometry args={[size + 0.17, 0.07, size + 0.17]} />
        <meshStandardMaterial color="#3b2618" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.0705, 0.6 + 0.0425]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size + 0.17, 0.085]} />
        <meshStandardMaterial map={frame} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.071, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={squares} roughness={0.35} />
      </mesh>
      <group position={[0, 0.071, 0]}>
        {pieces.map((p) => (
          <group key={p.key} position={[p.x, 0, p.z]}>
            <Piece kind={p.kind} white={p.white} geo={geo} />
          </group>
        ))}
      </group>
    </Interactive>
  )
}
