import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { focusKeyboard, powerOnComputer } from '../basic/session'
import { getTerminal } from '../basic/terminal'
import { useStore } from '../store'
import { FONT_RETRO, FONT_SANS, useCanvasTexture } from './textures'
import { Interactive } from './Interactive'

// VIC-20 text screen: 22 columns (23 rows on the real thing; fewer here so it reads at desk distance), blue on white with a cyan border.
const COLS = 22
const ROWS = 16
const VIC = { border: '#79d4dc', paper: '#f2f1ea', ink: '#3131c6' }

type Step = { kind: 'print'; text: string } | { kind: 'type'; text: string } | { kind: 'wait'; t: number }

function wrap(text: string) {
  if (text === '') return ['']
  const out: string[] = []
  for (let i = 0; i < text.length; i += COLS) out.push(text.slice(i, i + COLS))
  return out
}

const BOOT: Step[] = [
  { kind: 'wait', t: 0.6 },
  { kind: 'print', text: '**** CBM BASIC V2 ****' },
  { kind: 'print', text: '3583 BYTES FREE' },
  { kind: 'print', text: '' },
  { kind: 'wait', t: 0.3 },
  { kind: 'print', text: 'READY.' },
]

const LOAD: Step[] = [
  { kind: 'type', text: 'LOAD"SNAKE",8' },
  { kind: 'print', text: '' },
  { kind: 'wait', t: 0.2 },
  { kind: 'print', text: 'SEARCHING FOR SNAKE' },
  { kind: 'wait', t: 0.7 },
  { kind: 'print', text: 'LOADING' },
  { kind: 'wait', t: 0.9 },
  { kind: 'print', text: 'READY.' },
  { kind: 'type', text: 'RUN' },
  { kind: 'print', text: '' },
  { kind: 'print', text: 'IT REALLY RUNS BASIC.' },
  { kind: 'print', text: 'CLICK TO POWER ON.' },
  { kind: 'print', text: '' },
  { kind: 'print', text: 'READY.' },
]

class VicScreen {
  lines: string[] = []
  typing: string | null = null
  queue: Step[] = []
  timer = 0
  dirty = true

  reset() {
    this.lines = []
    this.typing = null
    this.queue = [...BOOT]
    this.timer = 0
    this.dirty = true
  }

  enqueue(steps: Step[]) {
    this.queue.push(...steps)
  }

  get busy() {
    return this.queue.length > 0
  }

  update(dt: number) {
    this.timer -= dt
    while (this.timer <= 0 && this.queue.length) {
      const step = this.queue[0]
      if (step.kind === 'wait') {
        this.timer += step.t
        this.queue.shift()
      } else if (step.kind === 'print') {
        if (this.typing !== null) {
          this.lines.push(...wrap(this.typing))
          this.typing = null
        }
        this.lines.push(...wrap(step.text))
        this.timer += 0.05
        this.queue.shift()
        this.dirty = true
      } else {
        const typed = this.typing ?? ''
        if (typed.length < step.text.length) {
          this.typing = step.text.slice(0, typed.length + 1)
          this.timer += 0.06 + Math.random() * 0.05
          this.dirty = true
        } else {
          this.lines.push(...wrap(this.typing ?? ''))
          this.typing = null
          this.queue.shift()
        }
      }
    }
    if (this.lines.length > ROWS) this.lines.splice(0, this.lines.length - ROWS + 1)
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, cursorOn: boolean) {
    const bx = w * 0.09
    const by = h * 0.1
    const tw = w - bx * 2
    const th = h - by * 2
    const cw = tw / COLS
    const lh = th / ROWS

    ctx.fillStyle = VIC.border
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = VIC.paper
    ctx.fillRect(bx, by, tw, th)

    ctx.fillStyle = VIC.ink
    ctx.font = `${Math.round(lh * 1.32)}px ${FONT_RETRO}`
    ctx.textBaseline = 'top'
    const glyph = ctx.measureText('M').width
    const sx = cw / glyph

    const visible = [...this.lines, ...(this.typing !== null ? wrap(this.typing) : [''])].slice(-ROWS)
    visible.forEach((line, row) => {
      for (let i = 0; i < line.length; i++) {
        ctx.save()
        ctx.translate(bx + i * cw, by + row * lh - lh * 0.2)
        ctx.scale(sx * 0.92, 1)
        // Draw twice, offset, for chunky VIC-20 strokes.
        ctx.fillText(line[i], 0, 0)
        ctx.fillText(line[i], 1.5, 0)
        ctx.restore()
      }
    })

    if (cursorOn) {
      const row = visible.length - 1
      const col = visible[row].length
      ctx.fillRect(bx + col * cw, by + row * lh, cw, lh)
    }

    // Scanlines and vignette sell the CRT.
    ctx.fillStyle = 'rgba(0,0,0,0.07)'
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2)
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

function useCurvedPlane(width: number, height: number, bulge: number) {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, 24, 24)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (width / 2)
      const y = pos.getY(i) / (height / 2)
      pos.setZ(i, bulge * (1 - (x * x + y * y) / 2))
    }
    geo.computeVertexNormals()
    return geo
  }, [width, height, bulge])
}

function CrtMonitor({ screen }: { screen: VicScreen }) {
  const { canvas, ctx, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1536
    canvas.height = 1152
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return { canvas, ctx: canvas.getContext('2d')!, texture }
  }, [])
  const glass = useCurvedPlane(1.3, 0.98, 0.035)
  const light = useRef<THREE.PointLight>(null)
  const lastCursor = useRef<boolean | null>(null)

  const terminal = getTerminal()
  const wasOn = useRef(false)

  useFrame((state, dt) => {
    const blink = Math.floor(state.clock.elapsedTime * 2) % 2 === 0
    const on = terminal.mode !== 'off'
    if (on) {
      // Powered on: the live Arcade BASIC terminal.
      if (terminal.dirty || blink !== lastCursor.current || !wasOn.current) {
        terminal.draw(ctx, canvas.width, canvas.height, blink, FONT_RETRO)
        texture.needsUpdate = true
        terminal.dirty = false
        lastCursor.current = blink
      }
    } else {
      screen.update(Math.min(dt, 1))
      const cursorOn = screen.typing !== null || blink
      if (screen.dirty || cursorOn !== lastCursor.current || wasOn.current) {
        screen.draw(ctx, canvas.width, canvas.height, cursorOn)
        texture.needsUpdate = true
        screen.dirty = false
        lastCursor.current = cursorOn
      }
    }
    wasOn.current = on
    // Subtle CRT flicker on the glow it casts.
    if (light.current) light.current.intensity = 2.2 + Math.sin(state.clock.elapsedTime * 60) * 0.05
  })

  const badge = useCanvasTexture(256, 64, (c, w, h) => {
    c.fillStyle = '#cbbf9f'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#5b5040'
    c.font = `600 34px ${FONT_SANS}`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('1702 COLOR', w / 2, h / 2 + 2)
  })

  return (
    <group position={[0, 0, -0.75]}>
      {/* Stand */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.08, 0.8]} />
        <meshStandardMaterial color="#b8ad92" roughness={0.8} />
      </mesh>
      {/* Rear housing */}
      <mesh position={[0, 0.8, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[1.35, 1.1, 0.85]} />
        <meshStandardMaterial color="#cdc2a6" roughness={0.75} />
      </mesh>
      {/* Front bezel */}
      <RoundedBox args={[1.72, 1.42, 0.24]} radius={0.06} smoothness={4} position={[0, 0.8, 0.02]} castShadow receiveShadow>
        <meshStandardMaterial color="#ddd3b8" roughness={0.7} />
      </RoundedBox>
      {/* Screen recess */}
      <mesh position={[0, 0.88, 0.141]}>
        <planeGeometry args={[1.44, 1.1]} />
        <meshStandardMaterial color="#1a1916" roughness={0.9} />
      </mesh>
      {/* Phosphor */}
      <mesh geometry={glass} position={[0, 0.88, 0.142]}>
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Glass reflection */}
      <mesh geometry={glass} position={[0, 0.88, 0.147]}>
        <meshPhysicalMaterial transparent opacity={0.12} roughness={0.05} metalness={0} clearcoat={1} color="#ffffff" />
      </mesh>
      {/* Controls along the bottom of the bezel */}
      <mesh position={[-0.55, 0.2, 0.15]}>
        <planeGeometry args={[0.32, 0.08]} />
        <meshStandardMaterial map={badge} roughness={0.8} />
      </mesh>
      {[0.3, 0.42, 0.54].map((x) => (
        <mesh key={x} position={[x, 0.2, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 16]} />
          <meshStandardMaterial color="#4a4136" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0.7, 0.2, 0.145]}>
        <circleGeometry args={[0.014, 12]} />
        <meshBasicMaterial color="#ff3b2f" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.9, 0.7]} color="#bfeeff" intensity={2.2} distance={3.5} decay={2} />
    </group>
  )
}

function Keyboard() {
  const keys = useRef<THREE.InstancedMesh>(null)
  const fkeys = useRef<THREE.InstancedMesh>(null)
  const pitch = 0.088
  const rows = [16, 16, 15, 14]

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    let i = 0
    rows.forEach((count, r) => {
      const offset = r * 0.022
      for (let k = 0; k < count; k++) {
        const x = -0.78 + offset + k * pitch
        m.setPosition(x, 0.15, -0.13 + r * pitch)
        keys.current!.setMatrixAt(i++, m)
      }
    })
    keys.current!.instanceMatrix.needsUpdate = true
    for (let f = 0; f < 4; f++) {
      m.setPosition(0.74, 0.15, -0.13 + f * pitch)
      fkeys.current!.setMatrixAt(f, m)
    }
    fkeys.current!.instanceMatrix.needsUpdate = true
  })

  const total = rows.reduce((a, b) => a + b, 0)

  const label = useCanvasTexture(512, 96, (c, w, h) => {
    c.fillStyle = '#2b211b'
    c.fillRect(0, 0, w, h)
    const stripes = ['#d8452f', '#ef8f2a', '#f2c94c', '#3f9a5a', '#3f6fc4']
    stripes.forEach((col, i) => {
      c.fillStyle = col
      c.fillRect(w - 150 + i * 26, 0, 18, h)
    })
    c.fillStyle = '#e9dfc6'
    c.font = `700 52px ${FONT_SANS}`
    c.textBaseline = 'middle'
    c.fillText('VIC-20', 24, h / 2 + 3)
  })

  return (
    <group position={[0, 0, 0.55]} rotation={[0.05, 0, 0]}>
      <RoundedBox args={[1.75, 0.16, 0.62]} radius={0.03} smoothness={3} position={[0, 0.06, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e6dbbf" roughness={0.65} />
      </RoundedBox>
      <instancedMesh ref={keys} args={[undefined, undefined, total]} castShadow>
        <boxGeometry args={[0.072, 0.035, 0.072]} />
        <meshStandardMaterial color="#4a3428" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={fkeys} args={[undefined, undefined, 4]} castShadow>
        <boxGeometry args={[0.11, 0.035, 0.072]} />
        <meshStandardMaterial color="#c9a46a" roughness={0.5} />
      </instancedMesh>
      {/* Space bar */}
      <mesh position={[-0.12, 0.15, 0.235]} castShadow>
        <boxGeometry args={[0.7, 0.035, 0.072]} />
        <meshStandardMaterial color="#4a3428" roughness={0.5} />
      </mesh>
      {/* Badge strip along the back */}
      <mesh position={[-0.5, 0.1405, -0.262]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.075]} />
        <meshStandardMaterial map={label} roughness={0.6} />
      </mesh>
    </group>
  )
}

export function Computer() {
  const screen = useMemo(() => new VicScreen(), [])
  const boot = useStore((s) => s.boot)
  const loaded = useRef(false)

  useEffect(() => {
    screen.reset()
    loaded.current = false
  }, [boot, screen])

  return (
    <Interactive
      name="VIC-20"
      title="VIC-20"
      blurb="Click to power on. It runs Arcade BASIC, my Full BASIC interpreter, compiled to WebAssembly."
      onActivate={() => {
        powerOnComputer()
        focusKeyboard()
      }}
      lift={0.02}
      onHoverChange={(on) => {
        if (on && !loaded.current) {
          loaded.current = true
          screen.enqueue(LOAD)
        }
      }}
    >
      <CrtMonitor screen={screen} />
      <Keyboard />
    </Interactive>
  )
}
