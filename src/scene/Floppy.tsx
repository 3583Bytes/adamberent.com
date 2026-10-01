import { links } from '../content'
import { FONT_RETRO, FONT_SANS, useCanvasTexture } from './textures'
import { Interactive } from './Interactive'

const SIZE = 0.44

// A 5.25" floppy with a hand-labelled sticker.
export function Floppy() {
  const top = useCanvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#161618'
    c.fillRect(0, 0, w, h)
    // Sticker
    c.fillStyle = '#f1ece0'
    c.fillRect(40, 24, w - 80, 120)
    c.fillStyle = '#c8432f'
    c.fillRect(40, 24, w - 80, 14)
    c.fillStyle = '#26338a'
    c.font = `600 44px ${FONT_SANS}`
    c.fillText('OPEN SOURCE', 62, 92)
    c.font = `34px ${FONT_RETRO}`
    c.fillText('github.com/3583Bytes', 62, 128)
    // Hub ring and hole
    c.fillStyle = '#d9d4c7'
    c.beginPath()
    c.arc(w / 2, h / 2 + 20, 64, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#0b0b0c'
    c.beginPath()
    c.arc(w / 2, h / 2 + 20, 40, 0, Math.PI * 2)
    c.fill()
    // Index hole and read/write window
    c.fillStyle = '#5a4a3a'
    c.beginPath()
    c.arc(w / 2 + 104, h / 2 + 10, 9, 0, Math.PI * 2)
    c.fill()
    c.beginPath()
    c.roundRect(w / 2 - 22, h - 150, 44, 128, 22)
    c.fill()
    // Write-protect notch
    c.fillStyle = '#3a2a1e'
    c.fillRect(w - 12, 150, 12, 40)
  })

  return (
    <Interactive
      name="Floppy disk"
      title={links.github.label}
      blurb={links.github.blurb}
      url={links.github.url}
      position={[0.15, 0, 1.3]}
      rotation={[0, 0.22, 0]}
      lift={0.06}
    >
      <mesh position={[0, 0.005, 0]} castShadow receiveShadow>
        <boxGeometry args={[SIZE, 0.01, SIZE]} />
        <meshStandardMaterial color="#161618" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.0105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial map={top} roughness={0.6} />
      </mesh>
    </Interactive>
  )
}
