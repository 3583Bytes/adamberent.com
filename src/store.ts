import { useSyncExternalStore } from 'react'

// Tiny shared store so the 3D scene and the DOM overlays can talk to each other.

export type Hovered = { title: string; blurb: string; url?: string } | null

export type Inspected = {
  name: string
  position: [number, number, number]
  triangles: number
  meshes: number
} | null

export type Stats = { fps: number; calls: number; triangles: number; geometries: number; textures: number }

type State = {
  hovered: Hovered
  consoleOpen: boolean
  wireframe: boolean
  inspectMode: boolean
  inspected: Inspected
  spin: boolean
  boot: number
  computerOn: boolean
  stats: Stats
}

let state: State = {
  hovered: null,
  consoleOpen: false,
  wireframe: false,
  inspectMode: false,
  inspected: null,
  spin: false,
  boot: 0,
  computerOn: false,
  stats: { fps: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 },
}

const listeners = new Set<() => void>()

export function getState() {
  return state
}

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}
