import { BasicMachine, Beeper } from './machine'
import { fetchProgram, programs } from './programs'

export const COLS = 64
export const ROWS = 30

const BANNER = ['**** ARCADE BASIC ****', 'FULL BASIC, COMPILED TO WEBASSEMBLY', '3583 BYTES FREE', '']

const HELP = [
  'RUN              RUN THE PROGRAM',
  'LIST             SHOW THE PROGRAM',
  'NEW              CLEAR THE PROGRAM',
  'DIR              LIST EXAMPLE PROGRAMS',
  'LOAD "SNAKE"     LOAD AN EXAMPLE',
  'CLS              CLEAR THE SCREEN',
  'ESC              STOP A PROGRAM, OR POWER OFF',
  '',
  '10 PRINT "HI"    ADD OR REPLACE A NUMBERED LINE',
  'PRINT 6*7        ANYTHING ELSE RUNS RIGHT AWAY',
  'PASTING A PROGRAM WORKS TOO.',
  '',
  'ARCADE BASIC IS OPEN SOURCE:',
  'GITHUB.COM/3583BYTES/ARCADE-BASIC',
]

type Mode = 'off' | 'boot' | 'idle' | 'running' | 'input'

// Arrow keys reach INKEY$ as CHR$(0) + a GW-BASIC scan code.
const SPECIAL_KEYS: Record<string, number> = {
  ArrowUp: 0x10000 + 72,
  ArrowDown: 0x10000 + 80,
  ArrowLeft: 0x10000 + 75,
  ArrowRight: 0x10000 + 77,
  Enter: 13,
  Backspace: 8,
  Tab: 9,
}

// The powered-on VIC-20: a 64x30 text screen with a line editor in front of
// Arcade BASIC, plus a 320x200 graphics layer for programs that draw.
export class Terminal {
  mode: Mode = 'off'
  dirty = true
  onPowerOff: () => void = () => {}

  private rows: string[] = ['']
  private input = ''
  private program: string[] = []
  private history: string[] = []
  private historyIndex = -1
  private machine: BasicMachine | null = null
  private readonly beeper = new Beeper()
  private graphics: HTMLCanvasElement | null = null
  private graphicsVisible = false

  powerOn() {
    if (this.mode !== 'off') return
    this.rows = ['']
    this.graphicsVisible = false
    BANNER.forEach((l) => this.println(l))
    this.mode = 'boot'
    this.println('LOADING...')
    this.machine ??= new BasicMachine({
      write: (text) => this.print(text),
      frame: (pixels, w, h) => this.showFrame(pixels, w, h),
      tone: (hz, on, off) => this.beeper.tone(hz, on, off),
      needLine: () => {
        this.mode = 'input'
        this.dirty = true
      },
    })
    this.machine
      .boot()
      .then(() => {
        if (this.mode !== 'boot') return
        this.rows.pop()
        this.rows.pop()
        this.rows.push('')
        if (!this.machine!.hasKeyboard) this.println('NOTE: THIS BROWSER CANNOT SEND KEYS TO RUNNING PROGRAMS.')
        this.println('TYPE HELP, OR LOAD "SNAKE" AND RUN.')
        this.ready()
      })
      .catch((err) => {
        this.println(`?LOAD ERROR: ${String(err).toUpperCase()}`)
        this.ready()
      })
  }

  // Shown while the page reloads once to enable shared memory.
  prepare() {
    this.rows = ['']
    this.graphicsVisible = false
    BANNER.forEach((l) => this.println(l))
    this.println('WARMING UP THE TUBES...')
    this.mode = 'boot'
  }

  powerOff() {
    this.machine?.stop()
    this.beeper.reset()
    this.mode = 'off'
    this.onPowerOff()
  }

  // --- Keyboard -----------------------------------------------------------

  key(e: KeyboardEvent): boolean {
    if (this.mode === 'off' || e.metaKey || e.ctrlKey || e.altKey) return false

    if (e.key === 'Escape') {
      if (this.mode === 'running' || this.mode === 'input') this.stop()
      else this.powerOff()
      return true
    }

    if (this.mode === 'running') {
      const code = SPECIAL_KEYS[e.key] ?? (e.key.length === 1 ? e.key.charCodeAt(0) : null)
      if (code === null) return false
      this.machine?.pushKey(code)
      return true
    }

    if (this.mode === 'boot') return e.key.length === 1
    return this.edit(e.key)
  }

  paste(text: string) {
    if (this.mode !== 'idle' && this.mode !== 'input') return
    const lines = text.replace(/\r\n?/g, '\n').split('\n')
    if (this.mode === 'input' || lines.length === 1) {
      this.input += lines[0]
      this.dirty = true
      return
    }
    // A pasted program: numbered lines are edited in, the rest appended.
    for (const line of lines) {
      if (!line.trim()) continue
      if (/^\s*\d+/.test(line)) this.editLine(line)
      else this.program.push(line)
    }
    this.println(`${lines.filter((l) => l.trim()).length} LINES PASTED.`)
    this.ready()
  }

  private edit(key: string) {
    if (key === 'Enter') {
      const line = this.input
      this.input = ''
      this.historyIndex = -1
      this.println(line, true)
      if (this.mode === 'input') {
        this.mode = 'running'
        this.machine?.sendLine(line)
      } else {
        if (line.trim()) this.history.unshift(line)
        void this.command(line)
      }
    } else if (key === 'Backspace') {
      this.input = this.input.slice(0, -1)
    } else if ((key === 'ArrowUp' || key === 'ArrowDown') && this.mode === 'idle') {
      const next = this.historyIndex + (key === 'ArrowUp' ? 1 : -1)
      this.historyIndex = Math.max(-1, Math.min(this.history.length - 1, next))
      this.input = this.historyIndex === -1 ? '' : this.history[this.historyIndex]
    } else if (key.length === 1) {
      this.input += key
    } else {
      return false
    }
    this.dirty = true
    return true
  }

  // --- Commands -----------------------------------------------------------

  private async command(raw: string) {
    const line = raw.trim()
    const upper = line.toUpperCase()
    const [head] = upper.split(/\s+/)
    if (!line) return this.ready(false)

    if (/^\d+/.test(line)) {
      this.editLine(line)
      return
    }

    switch (head) {
      case 'HELP':
        HELP.forEach((l) => this.println(l))
        return this.ready()
      case 'RUN':
        if (!this.program.length) {
          this.println('?NO PROGRAM  ERROR. TRY LOAD "SNAKE".')
          return this.ready()
        }
        return this.execute(this.program.join('\n'), 'program.bas')
      case 'LIST':
        this.program.forEach((l) => this.println(l))
        return this.ready()
      case 'NEW':
        this.program = []
        return this.ready()
      case 'CLS':
      case 'HOME':
        this.rows = ['']
        this.graphicsVisible = false
        return this.ready(false)
      case 'DIR':
      case 'CATALOG':
        return this.dir()
      case 'LOAD': {
        const name = line.slice(4).trim().replace(/,.*$/, '').replace(/"/g, '').trim().toLowerCase()
        if (name === '$' || name === '') return this.dir()
        return this.load(name)
      }
      case 'SYS':
        if (upper.replace(/\s+/g, '') === 'SYS64802') {
          this.program = []
          this.mode = 'off'
          this.powerOn()
          return
        }
        break
      case 'OFF':
      case 'EXIT':
      case 'QUIT':
      case 'BYE':
        return this.powerOff()
    }
    // Anything else is an immediate-mode statement.
    return this.execute(line, 'immediate.bas')
  }

  private editLine(line: string) {
    const match = line.match(/^\s*(\d+)\s*(.*)$/)!
    const number = Number(match[1])
    const numberOf = (l: string) => {
      const m = l.match(/^\s*(\d+)/)
      return m ? Number(m[1]) : null
    }
    const existing = this.program.findIndex((l) => numberOf(l) === number)
    if (!match[2]) {
      if (existing >= 0) this.program.splice(existing, 1)
    } else if (existing >= 0) {
      this.program[existing] = line.trim()
    } else {
      const after = this.program.findIndex((l) => (numberOf(l) ?? -1) > number)
      this.program.splice(after < 0 ? this.program.length : after, 0, line.trim())
    }
    this.dirty = true
  }

  private dir() {
    programs.forEach((p) => this.println(`${`"${p.name.toUpperCase()}"`.padEnd(13)} ${p.description.toUpperCase()}`))
    this.println('')
    this.println('LOAD "NAME" THEN RUN.')
    this.ready()
  }

  private async load(name: string) {
    this.println(`SEARCHING FOR ${name.toUpperCase()}`)
    const text = await fetchProgram(name)
    if (text === null || !programs.some((p) => p.name === name)) {
      this.println('?FILE NOT FOUND  ERROR. TRY DIR.')
      return this.ready()
    }
    this.program = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
    this.println('LOADING')
    this.ready()
  }

  private async execute(source: string, name: string) {
    if (!this.machine) return
    this.mode = 'running'
    this.graphicsVisible = false
    this.dirty = true
    const code = await this.machine.run(source, name)
    // Powering off mid-run also ends the program; nothing more to print then.
    if ((this.mode as Mode) === 'off') return
    if (code === -1) this.println('BREAK')
    this.ready()
  }

  private stop() {
    this.machine?.stop()
    this.beeper.reset()
  }

  private ready(blankLine = true) {
    if (blankLine && this.rows[this.rows.length - 1] !== '') this.println('')
    this.println('READY.')
    this.mode = 'idle'
  }

  // --- Output -------------------------------------------------------------

  print(text: string) {
    for (const ch of text) {
      if (ch === '\n') this.newline()
      else if (ch === '\r') continue
      else if (ch === '\t') this.print(' '.repeat(8 - (this.current.length % 8)))
      else if (ch === '\f') this.rows = ['']
      else {
        if (this.current.length >= COLS) this.newline()
        this.rows[this.rows.length - 1] += ch
      }
    }
    this.dirty = true
  }

  private println(text: string, echo = false) {
    if (echo) {
      // The typed line sits after whatever prompt is already on the row.
      this.print(text + '\n')
      return
    }
    if (this.current !== '') this.newline()
    this.print(text + '\n')
  }

  private get current() {
    return this.rows[this.rows.length - 1]
  }

  private newline() {
    this.rows.push('')
    if (this.rows.length > ROWS) this.rows.splice(0, this.rows.length - ROWS)
  }

  private showFrame(pixels: Int32Array, width: number, height: number) {
    if (this.mode === 'off') return
    if (!this.graphics) {
      this.graphics = document.createElement('canvas')
    }
    const canvas = this.graphics
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const image = ctx.createImageData(width, height)
    const data = image.data
    for (let i = 0; i < pixels.length; i++) {
      const argb = pixels[i]
      data[i * 4] = (argb >> 16) & 0xff
      data[i * 4 + 1] = (argb >> 8) & 0xff
      data[i * 4 + 2] = argb & 0xff
      data[i * 4 + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    // A program that draws takes over the screen, like switching to a graphics mode.
    if (!this.graphicsVisible) this.rows = ['']
    this.graphicsVisible = true
    this.dirty = true
  }

  // --- Drawing ------------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, cursorOn: boolean, font: string) {
    const bx = w * 0.06
    const by = h * 0.07
    const tw = w - bx * 2
    const th = h - by * 2
    const cw = tw / COLS
    const lh = th / ROWS
    const paper = this.graphicsVisible ? '#000000' : '#f2f1ea'
    const ink = this.graphicsVisible ? '#e9ecff' : '#3131c6'

    ctx.fillStyle = '#79d4dc'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = paper
    ctx.fillRect(bx, by, tw, th)

    if (this.graphicsVisible && this.graphics) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(this.graphics, bx, by, tw, th)
    }

    // The editing line wraps like any other output.
    const editing = this.mode === 'idle' || this.mode === 'input' || this.mode === 'boot'
    const lines = [...this.rows]
    if (editing && this.input) {
      const last = lines.pop()! + this.input
      for (let i = 0; i < last.length; i += COLS) lines.push(last.slice(i, i + COLS))
      if (last.length % COLS === 0) lines.push('')
    }
    const visible = lines.slice(-ROWS)

    ctx.fillStyle = ink
    ctx.font = `${Math.round(lh * 1.12)}px ${font}`
    ctx.textBaseline = 'top'
    const scaleX = cw / ctx.measureText('M').width
    visible.forEach((line, row) => {
      if (!line) return
      ctx.save()
      ctx.translate(bx, by + row * lh - lh * 0.08)
      ctx.scale(scaleX, 1)
      ctx.fillText(line, 0, 0)
      ctx.restore()
    })

    if (editing && cursorOn) {
      const row = visible.length - 1
      ctx.fillRect(bx + visible[row].length * cw, by + row * lh, cw, lh)
    }

    // Scanlines and vignette, same as the idle screen.
    ctx.fillStyle = 'rgba(0,0,0,0.06)'
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2)
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.9)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

let terminal: Terminal | null = null

export function getTerminal() {
  terminal ??= new Terminal()
  return terminal
}
