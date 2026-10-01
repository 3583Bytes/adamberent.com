import { lazy, Suspense, useEffect, useState } from 'react'
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
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  if (!hovered) return null
  const flip = pos.x > window.innerWidth - 300
  return (
    <div className="tooltip" style={{ left: pos.x, top: pos.y, transform: `translate(${flip ? 'calc(-100% - 18px)' : '18px'}, 18px)` }}>
      <div className="tooltip-title">{hovered.title}</div>
      <div className="tooltip-blurb">{hovered.blurb}</div>
      <div className="tooltip-action">{inspectMode ? 'CLICK TO INSPECT' : 'CLICK TO OPEN ↗'}</div>
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault()
        setState({ consoleOpen: !getState().consoleOpen })
      } else if (e.key === 'Escape' && getState().consoleOpen) {
        setState({ consoleOpen: false })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      <DevConsole />
    </>
  )
}
