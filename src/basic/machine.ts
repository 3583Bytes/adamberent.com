import { SAB, SAB_BYTES, type FromWorker, type ToWorker } from './protocol'

type Events = {
  write: (text: string) => void
  frame: (pixels: Int32Array, width: number, height: number) => void
  tone: (frequencyHz: number, soundedSeconds: number, silentSeconds: number) => void
  needLine: () => void
}

// Main-thread handle on the BASIC worker. Stopping a program terminates the worker
// and boots a fresh one, which also handles runaway loops like 10 GOTO 10.
export class BasicMachine {
  readonly shared: SharedArrayBuffer | null
  private readonly view: Int32Array | null
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private finish: ((code: number) => void) | null = null

  private readonly events: Events

  constructor(events: Events) {
    this.events = events
    this.shared = typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated ? new SharedArrayBuffer(SAB_BYTES) : null
    this.view = this.shared ? new Int32Array(this.shared) : null
  }

  get hasKeyboard() {
    return this.shared !== null
  }

  get running() {
    return this.finish !== null
  }

  boot() {
    if (this.ready) return this.ready
    this.ready = new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      this.worker = worker
      worker.onmessage = (e: MessageEvent<FromWorker>) => {
        const msg = e.data
        switch (msg.type) {
          case 'ready':
            resolve()
            break
          case 'error':
            reject(new Error(msg.message))
            break
          case 'write':
            this.events.write(msg.text)
            break
          case 'needLine':
            this.events.needLine()
            break
          case 'frame':
            this.events.frame(msg.pixels, msg.width, msg.height)
            break
          case 'tone':
            this.events.tone(msg.frequencyHz, msg.soundedSeconds, msg.silentSeconds)
            break
          case 'exit':
            this.settle(msg.code)
            break
        }
      }
      worker.onerror = (e) => reject(new Error(e.message))
      this.post({ type: 'init', shared: this.shared })
    })
    return this.ready
  }

  async run(source: string, name: string) {
    await this.boot()
    this.resetShared()
    return new Promise<number>((resolve) => {
      this.finish = resolve
      this.post({ type: 'run', source, name })
    })
  }

  stop() {
    if (!this.running) return
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    this.settle(-1)
    void this.boot()
  }

  sendLine(text: string) {
    const v = this.view
    if (!v) return
    const len = Math.min(text.length, SAB.lineMax)
    for (let i = 0; i < len; i++) v[SAB.lineData + i] = text.charCodeAt(i)
    v[SAB.lineLength] = len
    Atomics.store(v, SAB.lineReady, 1)
    Atomics.notify(v, SAB.lineReady)
  }

  pushKey(code: number) {
    const v = this.view
    if (!v) return
    const tail = Atomics.load(v, SAB.keyTail)
    const next = (tail + 1) % SAB.keyRingSize
    if (next === Atomics.load(v, SAB.keyHead)) return // full: drop the key
    v[SAB.keyRing + tail] = code
    Atomics.store(v, SAB.keyTail, next)
  }

  dispose() {
    this.worker?.terminate()
    this.worker = null
  }

  private settle(code: number) {
    const finish = this.finish
    this.finish = null
    finish?.(code)
  }

  private resetShared() {
    const v = this.view
    if (!v) return
    Atomics.store(v, SAB.lineReady, 0)
    Atomics.store(v, SAB.keyHead, 0)
    Atomics.store(v, SAB.keyTail, 0)
  }

  private post(msg: ToWorker) {
    this.worker?.postMessage(msg)
  }
}

// Square-wave beeper for SOUND, BEEP and PLAY. Tones queue back to back.
export class Beeper {
  private ctx: AudioContext | null = null
  private next = 0

  tone(frequencyHz: number, soundedSeconds: number, silentSeconds: number) {
    try {
      this.ctx ??= new AudioContext()
    } catch {
      return
    }
    const ctx = this.ctx
    void ctx.resume()
    // Drop effects rather than let a fast game loop build up seconds of backlog.
    if (this.next > ctx.currentTime + 2) return
    const start = Math.max(ctx.currentTime + 0.01, this.next)
    this.next = start + soundedSeconds + silentSeconds
    // Out-of-range frequencies (e.g. the classic 32767) are rests.
    if (frequencyHz < 20 || frequencyHz > 20000 || soundedSeconds <= 0) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = frequencyHz
    gain.gain.setValueAtTime(0.06, start)
    gain.gain.setValueAtTime(0.06, start + soundedSeconds - 0.005)
    gain.gain.linearRampToValueAtTime(0, start + soundedSeconds)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + soundedSeconds + 0.01)
  }

  reset() {
    this.next = 0
    void this.ctx?.close()
    this.ctx = null
  }
}
