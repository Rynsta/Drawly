# Security

## Reporting a vulnerability

If you believe you have found a security issue in this project, please use your Git host’s **private security advisory** flow (e.g. GitHub *Security → Report a vulnerability*) or contact the maintainers privately. Please avoid filing public issues for undisclosed vulnerabilities.

## Secrets and configuration

- **Never commit** `.env`, `.env.local`, or any file containing real API keys. This repository only ships [`.env.example`](./.env.example) and [`env.lan.example`](./env.lan.example) with placeholders.
- Production values (e.g. optional [Upstash](https://upstash.com) `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) belong solely in your host’s environment (Vercel, Railway, etc.).

## Dependency hygiene

- Run `npm audit` regularly and after dependency changes. As of the last maintenance pass, `npm audit` reported **0** vulnerabilities with **Next.js 15.5.x** and an updated `@playwright/test` dev dependency.
- Major upgrades may reintroduce advisories; treat `npm audit` output as advisory and confirm impact against your deployment model (e.g. self-hosted vs managed platform).

### Historical note (dev tooling)

Older toolchains pulled in a **glob** CLI advisory (command injection via `-c` / `--cmd`). That path affected **development** dependencies (ESLint / Next lint integration), not the runtime Socket.io server. Upgrading Next.js and `eslint-config-next` to current 15.x cleared the reported issues in this tree.

## Application threat model

Drawly is a **casual real-time party game** without user accounts or strong authentication.

| Topic | Notes |
|--------|--------|
| **Socket.io** | Clients connect anonymously. Room state is coordinated on trust; there is **no rate limiting** on events. |
| **Player identity** | Player IDs are chosen on the client and are **visible to everyone in the room**. The server allows reconnecting with an existing `player.id` in the same room (socket rebind), so anyone who knows another player’s ID could **grief or impersonate** that slot. This is acceptable for a lobby-style game but **not** suitable for high-assurance or competitive scenarios. |
| **CORS** | The socket server allows origins from `CLIENT_ORIGIN` or derived from `NEXT_PUBLIC_APP_URL` ([`server/index.ts`](./server/index.ts)). Misconfiguration in production can break clients or widen allowed origins—set these explicitly for each environment. |
| **Payload size** | Socket.io is configured with a large HTTP buffer limit for drawing payloads. Many concurrent large messages could stress a small server (**availability** risk). |
| **Stored content** | Game text and `data:` image URLs are stored in memory (and optionally Redis). Do not treat the service as a private vault for sensitive personal data. |

There is no `dangerouslySetInnerHTML` on user-controlled strings in the reviewed UI; text is rendered as React children and drawings use `<img src="data:...">` with server-side checks on submissions.

## Repository verification (maintainers)

Before making the repository public, confirm that `.env` / `.env.local` have **never** been committed (`git log` on those paths should be empty) and scan history for accidental secret strings if the repo was ever private with mistakes.
