import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { links, site } from '../content'
import { FONT_SANS, useCanvasTexture } from './textures'
import { Interactive } from './Interactive'

const W = 0.34
const H = 0.41
const PHOTO = 0.29

// A Polaroid of me on a little easel, between the monitor and the chessboard.
export function Polaroid() {
  const photo = useTexture(`${import.meta.env.BASE_URL}adam.jpg`)
  photo.colorSpace = THREE.SRGBColorSpace

  const caption = useCanvasTexture(512, 128, (c, w, h) => {
    c.fillStyle = '#f7f4ec'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#3a3630'
    c.font = `500 52px ${FONT_SANS}`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(site.name, w / 2, h / 2)
  })

  const paper = <meshStandardMaterial color="#f7f4ec" roughness={0.8} />

  return (
    <Interactive
      name="Polaroid"
      title={site.name}
      blurb="That's me. Say hello on LinkedIn."
      url={links.linkedin.url}
      position={[1.22, 0, -0.5]}
      rotation={[0, -0.28, 0]}
      lift={0.04}
    >
      <group scale={1.35}>
        <group position={[0, H / 2 + 0.01, 0]} rotation={[-0.16, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[W, H, 0.006]} />
            {paper}
          </mesh>
          <mesh position={[0, (H - W) / 2 + 0.005, 0.0035]}>
            <planeGeometry args={[PHOTO, PHOTO]} />
            <meshStandardMaterial map={photo} roughness={0.5} />
          </mesh>
          <mesh position={[0, -H / 2 + 0.042, 0.0035]}>
            <planeGeometry args={[PHOTO, PHOTO / 4]} />
            <meshStandardMaterial map={caption} roughness={0.8} />
          </mesh>
        </group>
        {/* Easel leg */}
        <mesh position={[0, 0.13, -0.09]} rotation={[0.45, 0, 0]} castShadow>
          <boxGeometry args={[0.04, 0.28, 0.008]} />
          <meshStandardMaterial color="#3b2a1e" roughness={0.7} />
        </mesh>
      </group>
    </Interactive>
  )
}
