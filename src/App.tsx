import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { focusKeyboard, powerOffComputer, powerOnComputer, registerServiceWorker, setKeyboardInput, takeAutostart } from './basic/session'
import { getTerminal } from './basic/terminal'
import { links, menu, site } from './content'
import { DevConsole } from './DevConsole'
import { getState, setState, useStore } from './store'

const Scene = lazy(() => import('./scene/Scene').then((m) => ({ default: m.Scene })))

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

// Canvas textures are drawn once, so wait for the web fonts before building the scene.
function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const fonts = ['32px VT323', '700 32px "Space Grotesk Variable"', '400 32px "Space Grotesk Variable"']
    const timeout = new Promise((r) => setTimeout(r, 2500))
    Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), timeout]).then(() => setReady(true))
  }, [])
  return ready
}

function Tooltip() {
  const hovered = useStore((s) => s.hovered)
  const inspectMode = useStore((s) => s.inspectMode)
  const computerOn = useStore((s) => s.computerOn)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  if (!hovered || computerOn) return null
  const flip = pos.x > window.innerWidth - 300
  return (
    <div className="tooltip" style={{ left: pos.x, top: pos.y, transform: `translate(${flip ? 'calc(-100% - 18px)' : '18px'}, 18px)` }}>
      <div className="tooltip-title">{hovered.title}</div>
      <div className="tooltip-blurb">{hovered.blurb}</div>
      <div className="tooltip-action">{inspectMode ? 'CLICK TO INSPECT' : hovered.url ? 'CLICK TO OPEN ↗' : 'CLICK TO POWER ON'}</div>
    </div>
  )
}

// Shown while zoomed in on the computer, with a hidden input that brings up the
// on-screen keyboard on touch devices.
function ComputerBar() {
  const computerOn = useStore((s) => s.computerOn)

  // Virtual keyboards often report keys only through input events.
  const onInput = (e: FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent
    const terminal = getTerminal()
    if (native.inputType === 'deleteContentBackward') {
      terminal.key(new KeyboardEvent('keydown', { key: 'Backspace' }))
    } else if (native.data) {
      for (const ch of native.data) terminal.key(new KeyboardEvent('keydown', { key: ch }))
    }
    e.currentTarget.value = ''
  }

  return (
    <div className={`computer-bar ${computerOn ? 'is-on' : ''}`} aria-hidden={!computerOn}>
      <input
        ref={setKeyboardInput}
        className="computer-input"
        aria-label="Type into the computer"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        tabIndex={-1}
        onInput={onInput}
      />
      <span className="computer-hint">
        Try <b>LOAD "SNAKE"</b> then <b>RUN</b>. Type <b>HELP</b> for more.
        <span className="computer-rotate"> Turn your phone sideways for a bigger screen.</span>
      </span>
      <button className="computer-off" onClick={() => powerOffComputer()} tabIndex={computerOn ? 0 : -1}>
        <span className="kbd">esc</span> power off
      </button>
    </div>
  )
}

function Fallback() {
  return (
    <main className="fallback">
      <div className="fallback-screen">
        <p>**** CBM BASIC V2 ****</p>
        <p>3583 BYTES FREE</p>
        <p>&nbsp;</p>
        <p>READY.</p>
        <p>
          LOAD"{site.name.toUpperCase()}",8<span className="console-cursor" />
        </p>
      </div>
    </main>
  )
}

export default function App() {
  const [webgl] = useState(hasWebGL)
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  const fontsReady = useFontsReady()
  const consoleOpen = useStore((s) => s.consoleOpen)
  const computerOn = useStore((s) => s.computerOn)

  useEffect(() => {
    registerServiceWorker()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault()
        setState({ consoleOpen: !getState().consoleOpen })
      } else if (e.key === 'Escape' && getState().consoleOpen) {
        setState({ consoleOpen: false })
      } else if (getState().computerOn && !getState().consoleOpen && getTerminal().key(e)) {
        e.preventDefault()
      }
    }
    const onPaste = (e: ClipboardEvent) => {
      if (!getState().computerOn || getState().consoleOpen) return
      e.preventDefault()
      getTerminal().paste(e.clipboardData?.getData('text') ?? '')
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  // After the one-time reload that enables shared memory, go straight back to the computer.
  useEffect(() => {
    if (fontsReady && takeAutostart()) {
      powerOnComputer()
    }
  }, [fontsReady])

  useEffect(() => {
    document.body.classList.toggle('computer-on', computerOn)
    if (computerOn) focusKeyboard()
  }, [computerOn])

  return (
    <>
      {webgl ? (
        <div className="stage" aria-hidden="true">
          {fontsReady && (
            <Suspense fallback={null}>
              <Scene reducedMotion={reducedMotion} />
            </Suspense>
          )}
        </div>
      ) : (
        <Fallback />
      )}

      <div className={`curtain ${fontsReady ? 'is-up' : ''}`} aria-hidden="true">
        <span>LOADING</span>
      </div>

      <header className="hero">
        <h1>{site.name}</h1>
        <p className="tagline">{site.tagline}</p>
        <p className="stat">{site.stat.toUpperCase()}</p>
        <p className="intro">
          <span className="prompt" aria-hidden="true">$</span> {site.intro}
          <span className="console-cursor" aria-hidden="true" />
        </p>
        {webgl && touch && <p className="hint-click">Tap anything. Drag to look around.</p>}
      </header>

      <nav className="menu" aria-label="Links">
        {menu.map((id) => (
          <a key={id} href={links[id].url} target="_blank" rel="noopener">
            {links[id].label} <span aria-hidden="true">↗</span>
          </a>
        ))}
      </nav>

      {webgl && (
        <button className="console-hint" onClick={() => setState({ consoleOpen: !consoleOpen })}>
          <span className="kbd">`</span> {consoleOpen ? 'close console' : 'dev console'}
        </button>
      )}

      <Tooltip />
      <ComputerBar />
      <DevConsole />
    </>
  )
}
