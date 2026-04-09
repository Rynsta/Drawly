# Security Policy

## Reporting a Vulnerability

If you discover a security issue, **do not open a public issue.** Instead, use one of these channels:

- **GitHub:** Open a [private security advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) via *Security > Report a vulnerability* on the repository.
- **Email:** Contact the maintainer directly if listed in the repository profile.

You should receive an acknowledgement within 72 hours. Fixes for confirmed vulnerabilities will be released as quickly as possible with appropriate credit.

---

## Secrets and Configuration

- `.env`, `.env.local`, and any file containing real credentials must **never** be committed. The repository only ships `.env.example` and `env.lan.example` with placeholder values.
- Production secrets (Upstash Redis credentials, CORS origins, etc.) must be configured through your hosting provider's environment variable management (Vercel, Railway, etc.).
- Before making the repository public or transferring ownership, verify that no secrets exist in the Git history: check `git log --all -- .env .env.local` and consider using tools like `trufflehog` or `gitleaks` for a thorough scan.

---

## Dependency Management

Run `npm audit` after every dependency change and periodically between releases. Treat advisories in the context of your deployment model:

- **Runtime dependencies** (Express, Socket.io, Next.js) &mdash; patch promptly.
- **Dev-only dependencies** (Playwright, ESLint, PostCSS) &mdash; lower urgency, but still keep current.

---

## Threat Model

Drawly is a **casual, unauthenticated party game**. The security posture reflects that context &mdash; it is not designed for competitive or high-assurance environments.

### Identity and Authentication

There are no user accounts. Player IDs are generated client-side and are visible to all room participants. The server allows reconnection by matching `player.id`, which means anyone who knows (or guesses) another player's ID within the same room could impersonate that player. This is an accepted trade-off for a frictionless join flow.

### Socket.io Transport

| Concern | Status |
|---|---|
| **Rate limiting** | Not implemented. A malicious client could flood events. Consider adding rate limiting (e.g. `socket.io-ratelimiter`) for public-facing deployments. |
| **CORS** | Origins are restricted to values in `CLIENT_ORIGIN` or derived from `NEXT_PUBLIC_APP_URL`. Misconfiguration (e.g. wildcards) would widen the attack surface. Always set explicit origins in production. |
| **Payload size** | `maxHttpBufferSize` is set to 15 MB to accommodate drawing data. Large payloads from many concurrent users could exhaust memory on small instances. |
| **Transport encryption** | Socket.io inherits TLS from the hosting provider. Ensure the socket server is behind HTTPS in production. |

### Stored Content

Game text and drawing data (base64 `data:` URIs) are held in server memory and optionally persisted to Upstash Redis. This data is transient game content &mdash; do not treat Drawly as a store for sensitive information. Room data is deleted when all players leave.

### Cross-Site Scripting (XSS)

User-provided text is rendered as React children (not via `dangerouslySetInnerHTML`). Drawing data is rendered through `<img src="data:image/...">` with server-side format validation on submission. No HTML injection vectors have been identified in the current codebase.

### Denial of Service

The primary DoS vector is event flooding through Socket.io. The server does not enforce per-socket rate limits or connection caps. For internet-facing deployments, consider:

- Rate limiting at the Socket.io or reverse-proxy layer
- Connection limits per IP
- Payload size validation beyond the current buffer limit
