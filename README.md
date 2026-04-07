<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/Socket.io-realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

<h1 align="center">Drawly</h1>

<p align="center">
  <strong>Draw → describe → repeat → reveal.</strong><br />
  A real-time party game: chained prompts, sketches, and guesses—ending in a flip-book style chain reveal you can walk through page by page.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#play-with-friends-same-wi-fi">Friends on Wi‑Fi</a> ·
  <a href="#deploy-for-the-internet">Deploy online</a> ·
  <a href="#scripts">Scripts</a>
</p>

---

## Why it’s fun

- **Rooms & codes** — Host creates a room; everyone joins with a short code.
- **Solo to party** — Supports 1–8 players (great for testing alone).
- **Timed turns** — Prompts, drawing canvas (brush, shapes, fill, undo), and descriptions.
- **Chain book reveal** — At the end, flip through the whole story like a book—not just one final image.
- **Polished UI** — Dark glass aesthetic, motion, confetti, and **0xProto Nerd Font** (UI build).

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/drawly.git
cd drawly
npm install
cp .env.example .env.local
npm run dev
```

Open **`http://localhost:3000`** (use `localhost`, not `127.0.0.1`, unless you add it to `CLIENT_ORIGIN`).

`npm run dev` starts **both** the Next.js app (port **3000**) and the **Socket.io** server (port **4000**). If ports are stuck:

```bash
npm run dev:reset
npm run dev
```

---

## Play with friends (same Wi‑Fi)

Friends’ browsers must talk to **your computer’s IP**, not `localhost` (localhost always means *their* machine).

1. On the host PC, find your LAN IP:
   - **Windows:** `ipconfig` → IPv4 address (e.g. `192.168.1.42`)
   - **macOS/Linux:** `ip addr` / `ifconfig`
2. Copy **`env.lan.example`** → **`.env.local`** and replace `192.168.x.x` with that IP everywhere.
3. Restart **`npm run dev`**.
4. **Firewall:** allow inbound **TCP 3000** and **4000** on private networks (Windows Defender Firewall).
5. Share **`http://YOUR_LAN_IP:3000`** with friends on the same network.

Everyone uses the same URL; the app will use your IP for the socket as well.

---

## Deploy (for the internet)

Drawly is **two processes**:

| Piece | Where it runs | Notes |
|--------|----------------|--------|
| **Next.js** | [Vercel](https://vercel.com), Netlify, etc. | `npm run build` — no Socket.io on the edge |
| **Socket server** | [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io), any VPS | Run `npm run start:socket` — host sets **`PORT`**; the server listens on `PORT` or `SOCKET_PORT` |

### Environment variables (production)

Set these on **both** sides where applicable:

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SOCKET_URL` | Next (build time) | Public URL of your socket server, e.g. `https://drawly-socket.railway.app` |
| `NEXT_PUBLIC_APP_URL` | Next | Your live site URL, e.g. `https://drawly.vercel.app` |
| `CLIENT_ORIGIN` | Socket server | **Exact** browser origin(s), comma-separated: `https://drawly.vercel.app` |
| `PORT` | Socket host | Usually injected by the host (Railway/Render) |

After changing `NEXT_PUBLIC_*`, **redeploy** the Next app so the client bundle picks them up.

Optional: **Upstash Redis** — set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` on the socket process for room snapshots (see `server/redis-store.ts`).

---

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Next `:3000` + socket `:4000` |
| `npm run dev:reset` | Kills common dev ports |
| `npm run dev:next` / `npm run dev:socket` | Run one half only |
| `npm run build` | Production Next build |
| `npm run start` | Production Next (after `build`) |
| `npm run start:socket` | Production socket server |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright smoke (install browsers: `npx playwright install chromium`) |

---

## Stack

- **Next.js 14** (App Router) · **React 18** · **Tailwind CSS** · **Framer Motion**
- **Zustand** · **Socket.io** · **perfect-freehand** canvas · **Lucide** icons
- **TypeScript** — app in `src/`; socket in `server/` (see `server/tsconfig.json`)

---

## Fonts & licenses

- **0xProto Nerd Font Propo** (bundled under `src/fonts/0xproto/`) — see **`src/fonts/0xproto/LICENSE`** (SIL Open Font License).  
- Nerd Fonts: [github.com/ryanoasis/nerd-fonts](https://github.com/ryanoasis/nerd-fonts)

---

## Project layout

```
drawly/
├── server/           # Express + Socket.io + game engine
├── src/app/          # Routes & layout
├── src/components/   # UI, room views, DrawingCanvas
├── e2e/              # Playwright tests
├── env.lan.example   # Template for same-Wi‑Fi play
└── .env.example      # Default local dev env
```

---

## Contributing

Issues and PRs welcome. Run **`npm run lint`**, **`npx tsc --noEmit`**, and **`npx tsc -p server/tsconfig.json`** before pushing.

---

<p align="center">
  Built for laughs. Ship it, share a room code, and ruin a friendship over a drawing of a toaster. 🎨
</p>
