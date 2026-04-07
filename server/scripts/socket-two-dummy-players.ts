/**
 * Spins up an in-process Socket.io server with two real clients and verifies
 * `game:submit` accepts 1-char text and a small PNG (same rules as deadline auto-submit).
 *
 * Run: npx tsx server/scripts/socket-two-dummy-players.ts
 */
import http from "http";
import type { AddressInfo } from "net";
import { Server } from "socket.io";
import { io as clientIo, type Socket as ClientSocket } from "socket.io-client";
import { RoomManager } from "../engine";
import { registerDrawlySocketHandlers } from "../socket-handlers";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAKmKmWQAAAABJRU5ErkJggg==";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function waitConnect(s: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("connect timeout")), 5000);
    s.once("connect", () => {
      clearTimeout(t);
      resolve();
    });
    s.once("connect_error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function emitAck<T>(s: ClientSocket, ev: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`ack timeout: ${ev}`)), 5000);
    const done = (ack: T) => {
      clearTimeout(t);
      resolve(ack);
    };
    if (payload === undefined) {
      s.emit(ev, done);
    } else {
      s.emit(ev, payload, done);
    }
  });
}

async function main() {
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 15e6,
  });
  const rooms = new RoomManager();
  registerDrawlySocketHandlers(io, rooms);

  await new Promise<void>((r) => httpServer.listen(0, r));
  const port = (httpServer.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}`;

  const a = clientIo(url, { transports: ["websocket"] });
  const b = clientIo(url, { transports: ["websocket"] });
  await Promise.all([waitConnect(a), waitConnect(b)]);

  const created = await emitAck<{ ok?: boolean; state?: { code: string } }>(
    a,
    "room:create",
    {
      player: {
        id: "dummy-a",
        name: "Dummy A",
        emoji: "🤖",
        color: "#ff0000",
      },
    },
  );
  assert(Boolean(created.ok && created.state?.code), "room:create");
  const code = created.state!.code;

  const joined = await emitAck<{ ok?: boolean }>(b, "room:join", {
    code,
    player: {
      id: "dummy-b",
      name: "Dummy B",
      emoji: "🤖",
      color: "#00ff00",
    },
  });
  assert(Boolean(joined.ok), "room:join");

  assert(Boolean(await emitAck<{ ok?: boolean }>(a, "room:ready", { ready: true })), "ready a");
  assert(Boolean(await emitAck<{ ok?: boolean }>(b, "room:ready", { ready: true })), "ready b");

  const started = await emitAck<{ ok?: boolean }>(a, "game:start");
  assert(Boolean(started.ok), "game:start");

  const submitA = await emitAck<{ ok?: boolean }>(a, "game:submit", { text: "x" });
  assert(Boolean(submitA.ok), "game:submit 1-char prompt (dummy A)");

  const submitB = await emitAck<{ ok?: boolean }>(b, "game:submit", { text: "" });
  assert(Boolean(submitB.ok), "game:submit empty prompt (dummy B)");

  const drawA = await emitAck<{ ok?: boolean }>(a, "game:submit", {
    imageDataUrl: TINY_PNG,
  });
  assert(Boolean(drawA.ok), "game:submit draw (dummy A)");

  const drawB = await emitAck<{ ok?: boolean }>(b, "game:submit", {
    imageDataUrl: TINY_PNG,
  });
  assert(Boolean(drawB.ok), "game:submit draw (dummy B)");

  a.close();
  b.close();
  io.close();
  await new Promise<void>((r) => httpServer.close(() => r()));

  console.log("socket-two-dummy-players: all checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
