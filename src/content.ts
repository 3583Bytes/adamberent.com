// All site copy and links live here. Edit this file to change what the site says.

export const site = {
  name: 'Adam Berent',
  tagline: 'Engineering leader by day. Indie game developer by night.',
  stat: '35 million players and counting.',
  intro: 'git commit -m "fix: homepage was boring"',
}

export type LinkId = 'games' | 'chess' | 'linkedin' | 'github' | 'strava' | 'discord'

export const links: Record<LinkId, { label: string; url: string; blurb: string }> = {
  games: {
    label: '3583 Bytes',
    url: 'https://www.3583bytes.com/',
    blurb: 'Where the name came from. A VIC-20 boots with 3583 bytes free, and that was enough to start.',
  },
  chess: {
    label: 'ChessBin',
    url: 'https://chessbin.com/',
    blurb: 'I started writing a chess engine in 2008. Now it has a home. Play it at ChessBin.',
  },
  linkedin: {
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/aberent',
    blurb: 'The professional version of me lives on LinkedIn.',
  },
  github: {
    label: 'GitHub',
    url: 'https://github.com/3583Bytes/',
    blurb: 'Source code, on a floppy. Open-source projects from 3583 Bytes.',
  },
  strava: {
    label: 'Strava',
    url: 'https://www.strava.com/athletes/102300293',
    blurb: 'Now playing: Long Run. Follow along on Strava.',
  },
  discord: {
    label: 'Discord',
    url: 'https://discord.gg/DzxjTmrvCr',
    blurb: 'Hang out with other 3583 Bytes players.',
  },
}

// Links shown in the always-visible menu, in order.
export const menu: LinkId[] = ['linkedin', 'games', 'chess', 'github', 'strava']

export type Game = { title: string; url: string; downloads: string; color: string; blurb: string }

// One cartridge per game on the shelf.
export const games: Game[] = [
  {
    title: 'Train Sim',
    url: 'https://www.3583bytes.com/the-games/train-sim/',
    downloads: '35M+',
    color: '#c8432f',
    blurb: '35M+ downloads. Drive 80+ realistic trains. My most popular game, now on Steam too.',
  },
]
