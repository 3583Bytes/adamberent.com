/// <reference lib="webworker" />
// Runs the Arcade BASIC interpreter (.NET WebAssembly) off the main thread.
// The interpreter is synchronous, so keyboard input and INPUT lines arrive through
// shared memory that this worker reads while BASIC code is running.

import { SAB, type FromWorker, type ToWorker } from './protocol'

declare const self: DedicatedWorkerGlobalScope

let shared: Int32Array | null = null
let exports: { Host: { Run(source: string, name: string): number } } | null = null

const post = (msg: FromWorker, transfer: Transferable[] = []) => self.postMessage(msg, transfer)

const host = {
  write(text: string) {
    post({ type: 'write', text })
  },
  readLine(): string | null {
    if (!shared) return null
    post({ type: 'needLine' })
    Atomics.wait(shared, SAB.lineReady, 0)
    const len = shared[SAB.lineLength]
    Atomics.store(shared, SAB.lineReady, 0)
    if (len < 0) return null
    let line = ''
    for (let i = 0; i < len; i++) line += String.fromCharCode(shared[SAB.lineData + i])
    return line
  },
  readKey(): string {
    if (!shared) return ''
    const head = Atomics.load(shared, SAB.keyHead)
    if (head === Atomics.load(shared, SAB.keyTail)) return ''
    const code = shared[SAB.keyRing + head]
    Atomics.store(shared, SAB.keyHead, (head + 1) % SAB.keyRingSize)
    // Special keys use the GW-BASIC convention: CHR$(0) followed by a scan code.
    return code >= 0x10000 ? '\0' + String.fromCharCode(code - 0x10000) : String.fromCharCode(code)
  },
  present(view: { slice(): Int32Array }, width: number, height: number) {
    const pixels = view.slice()
    post({ type: 'frame', pixels, width, height }, [pixels.buffer])
  },
  tone(frequencyHz: number, soundedSeconds: number, silentSeconds: number) {
    post({ type: 'tone', frequencyHz, soundedSeconds, silentSeconds })
  },
}

// Start the .NET runtime as soon as the worker loads: creating it later, from inside
// a message handler, never resolves.
async function boot(base: string) {
  const url = `${base}basic/_framework/dotnet.js`
  const { dotnet } = await import(/* @vite-ignore */ url)
  const runtime = await dotnet.create()
  runtime.setModuleImports('host', host)
  return runtime.getAssemblyExports(runtime.getConfig().mainAssemblyName)
}

const booting = boot(import.meta.env.BASE_URL)

self.addEventListener('message', async (e: MessageEvent<ToWorker>) => {
  const msg = e.data
  if (msg.type === 'init') {
    shared = msg.shared ? new Int32Array(msg.shared) : null
    try {
      exports = await booting
      post({ type: 'ready' })
    } catch (err) {
      post({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'run' && exports) {
    let code = 1
    try {
      code = exports.Host.Run(msg.source, msg.name)
    } catch (err) {
      host.write(`${err}\n`)
    }
    post({ type: 'exit', code })
  }
})
