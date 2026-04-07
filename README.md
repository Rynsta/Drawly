<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/Socket.io-realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

<h1 align="center">Drawly</h1>

<p align="center">
  <strong>Draw → describe → repeat → reveal.</strong><br />
  A real-time party game: chained prompts, sketches, and guesses, ending in a flip-book style chain reveal.
</p>

<p align="center">
  <a href="https://drawly-khaki.vercel.app/"><strong>Play Drawly</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/rpaiMC/Drawly"><strong>Source on GitHub</strong></a>
</p>

---

## Repository layout

This project is a **Next.js** frontend plus a **Socket.io** game server in one tree.

```
.
├── server/                 # Socket.io + Express; game engine and room state
│   ├── index.ts            # Server entry
│   ├── socket-handlers.ts  # Room / game / reveal socket events
│   ├── engine.ts           # Rounds, timers, submissions, books
│   ├── redis-store.ts      # Optional Upstash Redis persistence
│   └── scripts/            # Small local checks (timeout submit, socket dummies)
├── src/
│   ├── app/                # App Router: pages and layout
│   ├── components/         # Lobby, game, reveal, canvas, UI
│   ├── hooks/
│   └── lib/                # Zustand store, socket client, shared game types
├── e2e/                    # Playwright tests
├── railway.toml            # Socket service process (e.g. Railway)
├── next.config.mjs
├── playwright.config.ts
├── tailwind.config.ts
└── package.json
```

Shared types for the client and server live in **`src/lib/game-types.ts`** (the server TypeScript config pulls that file in).

---

## Stack

Next.js (App Router), React, Tailwind CSS, Framer Motion, Zustand, Socket.io, **perfect-freehand** for drawing, Lucide icons.

---

## Security

See [SECURITY.md](./SECURITY.md) for how to report issues, handling of secrets, dependency checks (`npm audit`), and the **threat model** for the unauthenticated realtime game (player IDs in rooms, no rate limits, CORS configuration).

---

## Contributing

Issues and pull requests are welcome.
