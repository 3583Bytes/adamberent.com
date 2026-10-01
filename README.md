# adamberent.com

A single-page personal site: an interactive retro desk built with React, TypeScript and
react-three-fiber. Every object is made in code (no 3D model files).

- **VIC-20 + CRT** → 3583 Bytes
- **Cartridge shelf** → individual games
- **Chessboard** → ChessBin
- **Rolodex** and **Polaroid** → LinkedIn
- **Floppy disk** → GitHub
- **iPod** → Strava
- Press **`** for the dev console (`help` lists commands).

## Editing content

All copy and links live in [`src/content.ts`](src/content.ts).

## Development

```sh
nvm use        # Node 24
npm install
npm run dev    # http://localhost:5173
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
