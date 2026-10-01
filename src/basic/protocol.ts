// Messages and shared-memory layout between the page and the BASIC worker.

export const SAB = {
  lineReady: 0, // 1 when the page has written an INPUT line
  lineLength: 1, // -1 means end of input (program stopped)
  keyHead: 2,
  keyTail: 3,
  keyRing: 8,
  keyRingSize: 64,
  lineData: 80,
  lineMax: 1000,
} as const

export const SAB_BYTES = (SAB.lineData + SAB.lineMax) * 4

export type ToWorker =
  | { type: 'init'; shared: SharedArrayBuffer | null }
  | { type: 'run'; source: string; name: string }

export type FromWorker =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'write'; text: string }
  | { type: 'needLine' }
  | { type: 'frame'; pixels: Int32Array; width: number; height: number }
  | { type: 'tone'; frequencyHz: number; soundedSeconds: number; silentSeconds: number }
  | { type: 'exit'; code: number }
