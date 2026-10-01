import { useMemo } from 'react'
import * as THREE from 'three'
import { games, type Game } from '../content'
import { FONT_RETRO, FONT_SANS, fitText, makeCanvasTexture, useCanvasTexture } from './textures'
import { Interactive } from './Interactive'

const W = 0.22
const H = 0.32
const D = 0.05
const PITCH = 0.25
// With only a game or two on display, show the cartridges bigger.
const SCALE = games.length <= 2 ? 1.7 : 1

function labelTexture(game: Game) {
  return makeCanvasTexture(256, 372, (c, w, h) => {
    c.fillStyle = '#26231f'
    c.fillRect(0, 0, w, h)
    // Grip ridges at the top of the shell
    c.fillStyle = '#1b1916'
    for (let y = 10; y < 52; y += 9) c.fillRect(14, y, w - 28, 4)
    const lx = 16
    const ly = 64
    const lw = w - 32
    const lh = h - 84
    c.fillStyle = '#f1ead8'
    c.fillRect(lx, ly, lw, lh)
    c.fillStyle = game.color
    c.fillRect(lx, ly, lw, 128)
    // Simple pixel horizon on the colored band
    c.fillStyle = 'rgba(255,255,255,0.2)'
    for (let i = 0; i < 12; i++) c.fillRect(lx + i * 19, ly + 98 - ((i * 37) % 30), 12, 30 + ((i * 37) % 30))
    c.fillStyle = '#1e1b17'
    c.textAlign = 'center'
    c.font = `700 34px ${FONT_SANS}`
    const words = game.title.split(' ')
    const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [game.title]
    lines.forEach((line, i) => fitText(c, line, w / 2, ly + 172 + i * 36, lw - 16))
    c.font = `30px ${FONT_RETRO}`
    c.fillStyle = '#6a6154'
    c.fillText(`${game.downloads} DOWNLOADS`, w / 2, ly + lh - 46)
    c.fillStyle = game.color
    c.fillText('3583 BYTES', w / 2, ly + lh - 16)
  })
}

function Cartridge({ game, index }: { game: Game; index: number }) {
  const materials = useMemo(() => {
    const shell = new THREE.MeshStandardMaterial({ color: '#26231f', roughness: 0.55 })
    const front = new THREE.MeshStandardMaterial({ map: labelTexture(game), roughness: 0.6 })
    return [shell, shell, shell, shell, front, shell]
  }, [game])
  const x = (index - (games.length - 1) / 2) * PITCH

  return (
    <Interactive
      name={`Cartridge: ${game.title}`}
      title={game.title}
      blurb={game.blurb}
      url={game.url}
      position={[x, 0.06 + H / 2, 0.01]}
      rotation={[-0.1, 0, 0]}
      lift={0.14}
    >
      <mesh material={materials} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
    </Interactive>
  )
}

export function Cartridges() {
  const width = games.length * PITCH + 0.12
  const sign = useCanvasTexture(games.length === 1 ? 256 : 1024, 64, (c, w, h) => {
    c.fillStyle = '#3b2a1e'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#e9d9b6'
    c.font = `44px ${FONT_RETRO}`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(games.length === 1 ? '3583 BYTES' : '3583 BYTES  ·  20+ GAMES  ·  MOSTLY TRAINS', w / 2, h / 2 + 2)
  })

  return (
    <group position={[-2.05, 0, -0.45]} rotation={[0, 0.42, 0]} scale={SCALE}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.06, 0.26]} />
        <meshStandardMaterial color="#6b4a33" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.14, -0.12]} castShadow>
        <boxGeometry args={[width, 0.22, 0.03]} />
        <meshStandardMaterial color="#5c3f2b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.06, 0.131]}>
        <planeGeometry args={[width, 0.06]} />
        <meshStandardMaterial map={sign} roughness={0.7} />
      </mesh>
      {games.map((g, i) => (
        <Cartridge key={g.title} game={g} index={i} />
      ))}
    </group>
  )
}
