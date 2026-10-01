import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { links } from '../content'
import { FONT_SANS } from './textures'
import { Interactive } from './Interactive'

const BODY = { w: 0.36, h: 0.036, d: 0.6 }

// Classic iPod "Now Playing" screen with a ticking progress bar.
function useScreen() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')!
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const draw = (progress: number) => {
      const w = canvas.width
      const h = canvas.height
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#f4f7fb')
      bg.addColorStop(1, '#d7dee8')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      const bar = ctx.createLinearGradient(0, 0, 0, 30)
      bar.addColorStop(0, '#fdfdfd')
      bar.addColorStop(1, '#c4ccd6')
      ctx.fillStyle = bar
      ctx.fillRect(0, 0, w, 30)
      ctx.fillStyle = '#1b1b1b'
      ctx.font = `600 18px ${FONT_SANS}`
      ctx.textAlign = 'center'
      ctx.fillText('Now Playing', w / 2, 21)
      ctx.textAlign = 'left'
      ctx.fillText('▶', 10, 21)
      // Battery
      ctx.strokeStyle = '#333'
      ctx.strokeRect(w - 40, 9, 26, 13)
      ctx.fillStyle = '#5bbf4a'
      ctx.fillRect(w - 38, 11, 18, 9)
      // Album art
      const art = ctx.createLinearGradient(16, 50, 116, 150)
      art.addColorStop(0, '#fc5200')
      art.addColorStop(1, '#ff9f45')
      ctx.fillStyle = art
      ctx.fillRect(16, 46, 104, 104)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.beginPath()
      ctx.moveTo(52, 128)
      ctx.lineTo(70, 82)
      ctx.lineTo(88, 128)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#111'
      ctx.font = `700 24px ${FONT_SANS}`
      ctx.fillText('Long Run', 134, 80)
      ctx.font = `18px ${FONT_SANS}`
      ctx.fillStyle = '#444'
      ctx.fillText('Adam Berent', 134, 108)
      ctx.fillText('Live on Strava', 134, 132)
      ctx.fillStyle = '#9aa4b2'
      ctx.fillRect(16, 178, w - 32, 10)
      ctx.fillStyle = '#3a7bd5'
      ctx.fillRect(16, 178, (w - 32) * progress, 10)
      const secs = Math.floor(progress * 3240)
      const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
      ctx.fillStyle = '#333'
      ctx.font = `16px ${FONT_SANS}`
      ctx.fillText(fmt(secs), 16, 212)
      ctx.textAlign = 'right'
      ctx.fillText(`-${fmt(3240 - secs)}`, w - 16, 212)
      ctx.textAlign = 'left'
      texture.needsUpdate = true
    }
    return { texture, draw }
  }, [])
}

function useWheelTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const c = canvas.getContext('2d')!
    const g = c.createRadialGradient(128, 128, 40, 128, 128, 128)
    g.addColorStop(0, '#f2f2f3')
    g.addColorStop(1, '#dedee1')
    c.fillStyle = g
    c.beginPath()
    c.arc(128, 128, 128, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#9a9aa0'
    c.font = `700 24px ${FONT_SANS}`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('MENU', 128, 28)
    c.fillText('▶❚❚', 128, 230)
    c.fillText('◀◀', 30, 128)
    c.fillText('▶▶', 226, 128)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

function Earbuds() {
  const tube = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, 0.02, -0.3),
      new THREE.Vector3(0.14, 0.008, -0.42),
      new THREE.Vector3(0.35, 0.006, -0.5),
      new THREE.Vector3(0.55, 0.006, -0.32),
      new THREE.Vector3(0.48, 0.006, -0.05),
      new THREE.Vector3(0.6, 0.006, 0.12),
    ])
    return new THREE.TubeGeometry(curve, 80, 0.006, 6, false)
  }, [])
  return (
    <group>
      <mesh geometry={tube} castShadow>
        <meshStandardMaterial color="#f4f4f4" roughness={0.4} />
      </mesh>
      {[
        [0.62, 0.025, 0.16],
        [0.7, 0.025, 0.08],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <sphereGeometry args={[0.032, 20, 14]} />
          <meshStandardMaterial color="#f7f7f7" roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

export function IPod() {
  const screen = useScreen()
  const wheel = useWheelTexture()
  const last = useRef(-1)

  useFrame((state) => {
    // Advance one "second" of the track per second, redraw only when it changes.
    const t = Math.floor(state.clock.elapsedTime)
    if (t !== last.current) {
      last.current = t
      screen.draw(((t + 1260) % 3240) / 3240)
    }
  })

  return (
    <Interactive
      name="iPod"
      title={links.strava.label}
      blurb={links.strava.blurb}
      url={links.strava.url}
      position={[1.3, 0, 1.05]}
      rotation={[0, -0.3, 0]}
      lift={0.06}
    >
      <RoundedBox args={[BODY.w, BODY.h, BODY.d]} radius={0.016} smoothness={4} position={[0, BODY.h / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#fbfbfb" roughness={0.18} clearcoat={1} clearcoatRoughness={0.1} />
      </RoundedBox>
      <mesh position={[0, BODY.h + 0.0005, -0.13]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.29, 0.2175]} />
        <meshBasicMaterial map={screen.texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, BODY.h + 0.0005, 0.14]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.115, 48]} />
        <meshStandardMaterial map={wheel} roughness={0.5} />
      </mesh>
      <mesh position={[0, BODY.h + 0.001, 0.14]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 32]} />
        <meshStandardMaterial color="#fafafa" roughness={0.3} />
      </mesh>
      <Earbuds />
    </Interactive>
  )
}
