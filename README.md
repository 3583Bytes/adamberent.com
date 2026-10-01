# adamberent.com

A single-page personal site: an interactive retro desk built with React, TypeScript and
react-three-fiber. Every object is made in code (no 3D model files).

- **VIC-20 + CRT** → powers on into a working BASIC computer (see below)
- **Cartridge shelf** → individual games
- **Chessboard** → ChessBin
- **Rolodex** and **Polaroid** → LinkedIn
- **Floppy disk** → GitHub
- **iPod** → Strava
- Press **`** for the dev console (`help` lists commands).

## The BASIC computer

Clicking the VIC-20 zooms into the CRT and boots [Arcade BASIC](https://github.com/3583Bytes/Arcade-BASIC),
a Full BASIC interpreter written in C#, compiled to WebAssembly and run in a Web Worker.
`LOAD "SNAKE"` then `RUN`; `DIR` lists the bundled programs and `HELP` lists commands.

- `basic/` is the C# host that wires the interpreter to the page (text, `INPUT`, `INKEY$`,
  graphics, sound). `src/basic/` is the browser side: worker, terminal and line editor.
- `scripts/build-basic.sh` clones Arcade BASIC at a pinned commit (`ARCADE_REF`), publishes
  the WebAssembly bundle (~1.9 MB gzipped) to `public/basic/` and copies the example programs.
  It needs the .NET 10 SDK. Bump `ARCADE_REF` to pick up interpreter changes.
- Running programs read keys through `SharedArrayBuffer`, which requires cross-origin
  isolation. GitHub Pages can't send those headers, so `public/sw.js` adds them; the first
  time someone powers on, the page reloads once to let the service worker take over.

## Editing content

All copy and links live in [`src/content.ts`](src/content.ts).

## Development

```sh
nvm use               # Node 24
npm install
npm run build:basic   # once, and after bumping ARCADE_REF (needs the .NET 10 SDK)
npm run dev           # http://localhost:5173
npm run build  # outputs to dist/
```

## Deployment (GitHub Pages)

Pushing to `main` builds and deploys via `.github/workflows/deploy.yml`.

One-time setup:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. `public/CNAME` already contains `adamberent.com`. In **Settings → Pages**, enter
   `adamberent.com` as the custom domain and tick **Enforce HTTPS** once the certificate is issued.
4. At your DNS provider, point the domain at GitHub Pages:
   - `A` records for `adamberent.com`: `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www`: `<your-github-username>.github.io`
