<h1 align="center">
  Drawly
</h1>

<p align="center">
  A real-time multiplayer drawing and guessing game.<br/>
  Write a prompt. Draw it. Describe it. Watch the chaos unfold.
</p>

<p align="center">
  <a href="https://drawly-khaki.vercel.app/"><strong>Play Now</strong></a>
  &ensp;&middot;&ensp;
  <a href="#getting-started"><strong>Run Locally</strong></a>
  &ensp;&middot;&ensp;
  <a href="#architecture"><strong>Architecture</strong></a>
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_15-000?logo=next.js&logoColor=fff" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=fff" alt="Socket.io" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=fff" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=000" alt="React" />
</p>

---

## How It Works

Drawly is a digital take on the classic telephone game. Each round rotates through every player's chain:

1. **Prompt** &mdash; write something short and weird
2. **Draw** &mdash; illustrate the previous player's prompt
3. **Describe** &mdash; guess what the drawing is
4. **Repeat** &mdash; keep alternating until the chain is complete
5. **Reveal** &mdash; flip through every chain to see how things went off the rails

Games support **1&ndash;8 players** with configurable turn timers for drawing, describing, and prompts. Everything happens in real time with automatic reconnection support.

---

## Getting Started

### Prerequisites

- **Node.js** &ge; 18
- **npm** &ge; 9

### Install and Run

```bash
git clone https://github.com/Rynsta/Drawly.git
cd Drawly
npm install
cp .env.example .env.local
npm run dev
```

This starts both the Next.js frontend (`localhost:3000`) and the Socket.io game server (`localhost:4000`) concurrently.

### LAN Play

To play with friends on the same Wi-Fi network, copy `env.lan.example` into `.env.local` and replace `192.168.x.x` with your machine's local IP. Everyone connects to `http://<your-ip>:3000`.

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start frontend + socket server (development) |
| `npm run dev:next` | Start only the Next.js dev server |
| `npm run dev:socket` | Start only the Socket.io server |
| `npm run build` | Production build (Next.js) |
| `npm run start` | Serve the production build |
| `npm run start:socket` | Start the socket server for production |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run Playwright end-to-end tests |

---

## Architecture

Drawly is split into two processes that run independently and communicate through Socket.io:

```
┌──────────────────────────────┐     WebSocket      ┌──────────────────────────────┐
│         Next.js App          │ ◄────────────────►  │     Socket.io Game Server    │
│  (React, Zustand, Tailwind)  │                     │  (Express, Engine, Redis)    │
│         :3000                │                     │         :4000                │
└──────────────────────────────┘                     └──────────────────────────────┘
```

### Project Structure

```
server/
├── index.ts              Express + Socket.io bootstrap, CORS config
├── socket-handlers.ts    Event handlers: room, game, and reveal lifecycle
├── engine.ts             Game engine: rounds, timers, chain books, submissions
└── redis-store.ts        Optional Upstash Redis persistence

src/
├── app/                  Next.js App Router pages and layouts
│   └── room/[code]/      Dynamic room page
├── components/
│   ├── room/             LobbyView, GameView, RevealView, TurnTimer
│   ├── draw/             Drawing canvas (perfect-freehand)
│   └── ui/               Shared UI primitives (GlassCard, Button, etc.)
├── hooks/                Custom React hooks
└── lib/
    ├── game-types.ts     Shared types between client and server
    ├── store.ts          Zustand store with socket event bindings
    └── socket-client.ts  Socket.io client singleton

e2e/                      Playwright tests
```

### Key Technologies

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Routing, SSR, static assets |
| UI | Tailwind CSS, Framer Motion | Styling, animations |
| State | Zustand | Client-side state management |
| Drawing | perfect-freehand | Pressure-sensitive freehand strokes |
| Realtime | Socket.io | Bidirectional game events |
| Persistence | Upstash Redis (optional) | Room state survives server restarts |
| Testing | Playwright | End-to-end browser tests |

### Game Flow (Server)

The game engine in `server/engine.ts` manages the full lifecycle:

- **Lobby** &rarr; Host starts when all players are ready
- **Playing** &rarr; Rounds alternate between prompt, draw, and describe. Each player works on a rotating chain book. A server-side timer auto-submits placeholders for stragglers.
- **Reveal** &rarr; Host navigates through each chain book page by page

State is broadcast to all clients via `room:state` events. Per-player assignments are delivered individually via `game:assignment`.

---

## Deployment

Drawly requires two services: a static/SSR frontend and a persistent WebSocket server.

| Service | Deploy Target | Config |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Default Next.js preset |
| **Socket Server** | [Railway](https://railway.com) | Uses `railway.toml` &mdash; runs `npm run start:socket` |

Set these environment variables on each service:

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | Frontend | Full URL of the socket server |
| `NEXT_PUBLIC_APP_URL` | Frontend | Public URL of the frontend |
| `CLIENT_ORIGIN` | Socket server | Allowed CORS origins (comma-separated) |
| `PORT` | Socket server | Listening port (Railway sets this automatically) |
| `UPSTASH_REDIS_REST_URL` | Socket server | Optional &mdash; Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Socket server | Optional &mdash; Upstash Redis token |

---

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting, secret handling, and the application threat model.

---

## Contributing

Contributions are welcome. Open an issue to discuss larger changes before submitting a pull request.

---

## License

This project is not currently published under a specific open-source license. All rights are reserved by the author unless otherwise stated.
