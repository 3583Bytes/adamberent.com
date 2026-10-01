import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { links, site, type LinkId } from './content'
import { powerOnComputer } from './basic/session'
import { getState, setState, useStore } from './store'

const BANNER = ['**** ADAM BERENT DEV CONSOLE V2 ****', '3583 BYTES FREE', '', 'TYPE HELP FOR COMMANDS.', '', 'READY.']

const HELP = [
  'COMMANDS:',
  '  HELP         THIS LIST',
  '  STATS        RENDERER DETAILS',
  '  WIREFRAME    TOGGLE WIREFRAME',
  '  INSPECT      CLICK OBJECTS TO INSPECT',
  '  SPIN         GIVE THE DESK A SPIN',
  '  BASIC        POWER ON THE VIC-20',
  '  DIR          LIST LINKS',
  '  OPEN <NAME>  OPEN A LINK',
  '  WHOAMI       ABOUT ME',
  '  SYS 64802    REBOOT',
  '  CLS          CLEAR SCREEN',
  '  EXIT         CLOSE (OR PRESS `)',
]

const ALIASES: Record<string, LinkId> = {
  LINKEDIN: 'linkedin',
  GAMES: 'games',
  '3583BYTES': 'games',
  '3583': 'games',
  CHESS: 'chess',
  CHESSBIN: 'chess',
  GITHUB: 'github',
  STRAVA: 'strava',
  DISCORD: 'discord',
}

type Result = string[] | 'clear'

function openLink(id: LinkId): string[] {
  window.open(links[id].url, '_blank', 'noopener')
  return [`OPENING ${links[id].label.toUpperCase()}...`, 'READY.']
}

function run(raw: string): Result {
  const cmd = raw.trim().toUpperCase()
  const [head, ...rest] = cmd.split(/\s+/)
  const arg = rest.join(' ')
  const state = getState()

  if (!cmd) return []
  if (ALIASES[cmd]) return openLink(ALIASES[cmd])

  switch (head) {
    case 'HELP':
    case '?':
      return [...HELP, 'READY.']
    case 'CLS':
    case 'CLEAR':
      return 'clear'
    case 'EXIT':
    case 'QUIT':
      setState({ consoleOpen: false })
      return ['READY.']
    case 'STATS': {
      const s = state.stats
      return [
        `FPS........ ${s.fps}`,
        `DRAW CALLS. ${s.calls}`,
        `TRIANGLES.. ${s.triangles.toLocaleString()}`,
        `GEOMETRIES. ${s.geometries}`,
        `TEXTURES... ${s.textures}`,
        'ENGINE..... THREE.JS + REACT THREE FIBER',
        'ASSETS..... 0 BYTES. ALL MADE IN CODE.',
        'READY.',
      ]
    }
    case 'WIREFRAME':
    case 'WIRE': {
      const on = !state.wireframe
      setState({ wireframe: on })
      return [`WIREFRAME ${on ? 'ON' : 'OFF'}.`, 'READY.']
    }
    case 'INSPECT': {
      const on = !state.inspectMode
      setState({ inspectMode: on, inspected: null })
      return on
        ? ['INSPECT MODE ON.', 'CLICK AN OBJECT ON THE DESK.', 'LINKS ARE DISABLED UNTIL', 'YOU TYPE INSPECT AGAIN.', 'READY.']
        : ['INSPECT MODE OFF.', 'READY.']
    }
    case 'SPIN': {
      const on = !state.spin
      setState({ spin: on })
      return [on ? 'WHEEE.' : 'STOPPING.', 'READY.']
    }
    case 'DIR':
    case 'LS':
      return [
        '0 "ADAM BERENT     " AB 2A',
        ...Object.entries(ALIASES)
          .filter(([, id], i, all) => all.findIndex(([, other]) => other === id) === i)
          .map(([name]) => `1    "${name}"`.padEnd(22) + 'PRG'),
        '3583 BLOCKS FREE.',
        'READY.',
      ]
    case 'OPEN':
    case 'RUN': {
      const id = ALIASES[arg.replace(/"/g, '')]
      if (id) return openLink(id)
      return head === 'RUN' ? ['TRY: OPEN GAMES', 'READY.'] : ['?FILE NOT FOUND  ERROR', 'TRY DIR.', 'READY.']
    }
    case 'LOAD':
      if (arg.startsWith('"$"')) return run('DIR')
      return [
        `SEARCHING FOR ${arg.split(',')[0].replace(/"/g, '') || '*'}`,
        'LOADING',
        'THIS WOULD TAKE FOUR',
        'MINUTES ON A REAL 1541.',
        "YOU'RE WELCOME.",
        'READY.',
      ]
    case 'WHOAMI':
      return [site.tagline.toUpperCase(), site.stat.toUpperCase(), 'READY.']
    case 'SYS':
      if (arg === '64802') {
        setState({ boot: state.boot + 1, wireframe: false, spin: false, inspectMode: false, inspected: null })
        return 'clear'
      }
      return ['?ILLEGAL QUANTITY  ERROR', 'READY.']
    case 'POKE':
      return ['POKE ACCEPTED.', 'NOTHING HAPPENED.', 'VERY AUTHENTIC.', 'READY.']
    case 'PRINT':
    case 'PRINT"': {
      const m = raw.match(/print\s*"([^"]*)"?/i)
      return [m ? m[1].toUpperCase() : '', 'READY.']
    }
    case 'BASIC':
      powerOnComputer()
      return ['POWERING ON...', 'READY.']
    case 'SUDO':
      return ['?NICE TRY  ERROR', 'READY.']
    case 'HIRE':
      return ['GOOD IDEA.', ...openLink('linkedin')]
    default:
      return ['?SYNTAX  ERROR', 'READY.']
  }
}

export function DevConsole() {
  const open = useStore((s) => s.consoleOpen)
  const stats = useStore((s) => s.stats)
  const inspected = useStore((s) => s.inspected)
  const inspectMode = useStore((s) => s.inspectMode)
  const boot = useStore((s) => s.boot)
  const [log, setLog] = useState<string[]>(BANNER)
  const [input, setInput] = useState('')
  const history = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else inputRef.current?.blur()
  }, [open])

  useEffect(() => {
    if (boot > 0) setLog(BANNER)
  }, [boot])

  useEffect(() => {
    if (!inspected || !inspectMode) return
    const [x, y, z] = inspected.position.map((n) => n.toFixed(2))
    setLog((l) => [
      ...l,
      `OBJECT..... ${inspected.name.toUpperCase()}`,
      `POSITION... ${x}, ${y}, ${z}`,
      `MESHES..... ${inspected.meshes}`,
      `TRIANGLES.. ${inspected.triangles.toLocaleString()}`,
      'READY.',
    ])
  }, [inspected, inspectMode])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [log])

  const submit = () => {
    const result = run(input)
    if (input.trim()) history.current.unshift(input)
    historyIndex.current = -1
    setLog((l) => (result === 'clear' ? ['READY.'] : [...l, input.toUpperCase(), ...result].slice(-300)))
    setInput('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = historyIndex.current + (e.key === 'ArrowUp' ? 1 : -1)
      historyIndex.current = Math.max(-1, Math.min(history.current.length - 1, next))
      setInput(historyIndex.current === -1 ? '' : history.current[historyIndex.current])
    }
  }

  return (
    <div className={`console ${open ? 'is-open' : ''}`} role="dialog" aria-label="Developer console" aria-hidden={!open}>
      <div className="console-screen" onClick={() => inputRef.current?.focus()}>
        <div className="console-stats" aria-live="off">
          <span>FPS {stats.fps}</span>
          <span>CALLS {stats.calls}</span>
          <span>TRIS {stats.triangles.toLocaleString()}</span>
          <span>TEX {stats.textures}</span>
          {inspectMode && <span className="console-flag">INSPECT</span>}
        </div>
        <div className="console-log" ref={scrollRef}>
          {log.map((line, i) => (
            <div key={i}>{line || ' '}</div>
          ))}
          <div className="console-input">
            <span>{input.toUpperCase()}</span>
            <span className="console-cursor" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/`/g, ''))}
              onKeyDown={onKeyDown}
              tabIndex={open ? 0 : -1}
              aria-label="Console command"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
