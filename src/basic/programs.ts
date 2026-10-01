// Example programs bundled from the Arcade BASIC repo by scripts/build-basic.sh.
// Keep the names in sync with PROGRAMS in that script.
export const programs: { name: string; description: string }[] = [
  { name: 'snake', description: 'Snake. WASD or arrows.' },
  { name: 'tetris', description: 'Falling blocks. A/D move, W rotate.' },
  { name: 'breakout', description: 'Paddle and bricks. A/D or arrows.' },
  { name: 'invaders', description: 'Space Invaders. A/D move, space fires.' },
  { name: 'startrek', description: 'Super Star Trek (1978).' },
  { name: 'lunar', description: 'Lunar Lander (1969).' },
  { name: 'guess', description: 'Guess the number.' },
  { name: 'mandelbrot', description: 'Mandelbrot set in ASCII.' },
  { name: 'graphics', description: 'Graphics module demo.' },
  { name: 'music', description: 'PLAY and SOUND demo.' },
  { name: 'primes', description: 'Prime sieve.' },
  { name: 'fibonacci', description: 'Fibonacci numbers.' },
  { name: 'pi', description: 'Pi by Leibniz series.' },
  { name: 'hello', description: 'Hello, world.' },
]

export async function fetchProgram(name: string) {
  const res = await fetch(`${import.meta.env.BASE_URL}basic/programs/${name}.bas`)
  if (!res.ok) return null
  return res.text()
}
