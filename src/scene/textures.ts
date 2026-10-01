import { useMemo, useState } from 'react'
import * as THREE from 'three'

export const FONT_RETRO = 'VT323'
export const FONT_SANS = '"Space Grotesk Variable"'

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

export function makeCanvasTexture(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// Canvas-drawn texture, created once on mount. Fonts are loaded before the scene mounts.
export function useCanvasTexture(w: number, h: number, draw: Draw) {
  return useState(() => makeCanvasTexture(w, h, draw))[0]
}

// Draw text squeezed horizontally if needed so it fits maxWidth.
export function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  const width = ctx.measureText(text).width
  if (width <= maxWidth) {
    ctx.fillText(text, x, y)
    return
  }
  ctx.save()
  const align = ctx.textAlign
  const scale = maxWidth / width
  ctx.translate(x, y)
  ctx.scale(scale, 1)
  ctx.textAlign = align
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

export function useWoodTexture() {
  return useMemo(() => {
    const tex = makeCanvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#5a3a26'
      ctx.fillRect(0, 0, w, h)
      // Deterministic pseudo-random so the grain is stable between reloads.
      let seed = 7
      const rand = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      for (let i = 0; i < 260; i++) {
        const y = rand() * h
        const amp = 2 + rand() * 6
        const freq = 0.002 + rand() * 0.006
        const phase = rand() * Math.PI * 2
        ctx.strokeStyle = rand() > 0.5 ? 'rgba(30,16,8,0.18)' : 'rgba(140,96,60,0.12)'
        ctx.lineWidth = 0.5 + rand() * 2.5
        ctx.beginPath()
        for (let x = 0; x <= w; x += 8) {
          const yy = y + Math.sin(x * freq + phase) * amp
          if (x === 0) ctx.moveTo(x, yy)
          else ctx.lineTo(x, yy)
        }
        ctx.stroke()
      }
    })
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
  }, [])
}
