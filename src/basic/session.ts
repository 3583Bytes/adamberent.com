import { setState } from '../store'
import { getTerminal } from './terminal'

const RELOADED = 'basic:reloaded'
const AUTOSTART = 'basic:autostart'

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
}

function session(key: string, value?: string | null) {
  try {
    if (value === undefined) return sessionStorage.getItem(key)
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    // Storage blocked: behave as if nothing was stored.
  }
  return null
}

// True once, right after the reload that enabled cross-origin isolation.
export function takeAutostart() {
  const pending = session(AUTOSTART) === '1'
  if (pending) session(AUTOSTART, null)
  return pending
}

export function powerOnComputer() {
  const terminal = getTerminal()
  if (terminal.mode !== 'off') return
  terminal.onPowerOff = () => setState({ computerOn: false })
  setState({ computerOn: true, spin: false, hovered: null, consoleOpen: false })

  // The first time, the service worker has to take control (one reload) before
  // shared memory is available. Fall back to running without it if that stalls.
  const needsReload = !self.crossOriginIsolated && 'serviceWorker' in navigator && session(RELOADED) !== '1'
  if (!needsReload) {
    terminal.powerOn()
    return
  }
  terminal.prepare()
  session(RELOADED, '1')
  session(AUTOSTART, '1')
  const fallback = setTimeout(() => {
    session(AUTOSTART, null)
    terminal.mode = 'off'
    terminal.powerOn()
  }, 4000)
  void navigator.serviceWorker.ready.then(() => {
    clearTimeout(fallback)
    location.reload()
  })
}

export function powerOffComputer() {
  getTerminal().powerOff()
}

// Hidden input that brings up the on-screen keyboard on phones and tablets.
let keyboardInput: HTMLInputElement | null = null

export function setKeyboardInput(el: HTMLInputElement | null) {
  keyboardInput = el
}

export function focusKeyboard() {
  keyboardInput?.focus({ preventScroll: true })
}
