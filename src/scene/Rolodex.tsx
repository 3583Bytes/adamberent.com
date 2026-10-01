import { links, site } from '../content'
import { FONT_RETRO, FONT_SANS, useCanvasTexture } from './textures'
import { Interactive } from './Interactive'

const CARDS = 22
const CARD_W = 0.4
const CARD_H = 0.24
const AXLE_Y = 0.19

export function Rolodex() {
  const card = useCanvasTexture(512, 308, (c, w, h) => {
    c.fillStyle = '#f5f0e3'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = 'rgba(80,110,170,0.25)'
    c.lineWidth = 2
    for (let y = 96; y < h; y += 34) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(w, y)
      c.stroke()
    }
    c.strokeStyle = 'rgba(200,70,70,0.4)'
    c.beginPath()
    c.moveTo(0, 80)
    c.lineTo(w, 80)
    c.stroke()
    c.fillStyle = '#0a66c2'
    c.fillRect(w - 92, 18, 66, 66)
    c.fillStyle = '#fff'
    c.font = `700 46px ${FONT_SANS}`
    c.textAlign = 'center'
    c.fillText('in', w - 59, 68)
    c.textAlign = 'left'
    c.fillStyle = '#1d1b18'
    c.font = `700 44px ${FONT_SANS}`
    c.fillText(site.name.toUpperCase(), 26, 62)
    c.font = `38px ${FONT_RETRO}`
    c.fillStyle = '#2c3e6b'
    c.fillText('ENGINEERING LEADER', 26, 126)
    c.fillText('linkedin.com/in/aberent', 26, 194)
    c.fillStyle = '#7b7364'
    c.fillText('CALL ANYTIME. OR, YOU KNOW,', 26, 262)
    c.fillText('SEND A MESSAGE.', 26, 296)
  })

  const blank = (
    <meshStandardMaterial color="#efe8d6" roughness={0.85} />
  )

  return (
    <Interactive
      name="Rolodex"
      title={links.linkedin.label}
      blurb={links.linkedin.blurb}
      url={links.linkedin.url}
      position={[-2.2, 0, 0.85]}
      rotation={[0, 0.45, 0]}
      lift={0.06}
    >
      {/* Base */}
      <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.56, 0.05, 0.34]} />
        <meshStandardMaterial color="#1f1f22" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Side wheels and knob */}
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, AXLE_Y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
          <meshStandardMaterial color="#2a2a2e" roughness={0.35} metalness={0.7} />
        </mesh>
      ))}
      {[-0.25, 0.25].map((x) => (
        <mesh key={`leg${x}`} position={[x, 0.1, 0]}>
          <boxGeometry args={[0.02, 0.15, 0.04]} />
          <meshStandardMaterial color="#2a2a2e" roughness={0.35} metalness={0.7} />
        </mesh>
      ))}
      <mesh position={[0.29, AXLE_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.05, 20]} />
        <meshStandardMaterial color="#b0302a" roughness={0.4} />
      </mesh>
      {/* Fanned cards, each hinged on the axle */}
      {Array.from({ length: CARDS }, (_, i) => {
        // Cards flipped back behind the open one.
        const angle = -1.4 + (i / (CARDS - 1)) * 1.1
        return (
          <group key={i} position={[0, AXLE_Y, 0]} rotation={[angle, 0, 0]}>
            <mesh position={[0, CARD_H / 2 - 0.05, 0]} castShadow>
              <boxGeometry args={[CARD_W, CARD_H, 0.003]} />
              {blank}
            </mesh>
          </group>
        )
      })}
      {/* The card that's flipped open toward you */}
      <group position={[0, AXLE_Y, 0]} rotation={[-0.12, 0, 0]}>
        <mesh position={[0, CARD_H / 2 - 0.05, 0.002]} castShadow>
          <boxGeometry args={[CARD_W, CARD_H, 0.003]} />
          <meshStandardMaterial attach="material-0" color="#efe8d6" />
          <meshStandardMaterial attach="material-1" color="#efe8d6" />
          <meshStandardMaterial attach="material-2" color="#efe8d6" />
          <meshStandardMaterial attach="material-3" color="#efe8d6" />
          <meshStandardMaterial attach="material-4" map={card} roughness={0.85} />
          <meshStandardMaterial attach="material-5" color="#efe8d6" />
        </mesh>
      </group>
    </Interactive>
  )
}
