import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();
import express from "express";
import http from "http";
import cors from "cors";
import { Server, type Socket } from "socket.io";
import { RoomManager } from "./engine";

/** Railway/Render/Fly set `PORT`; local dev uses SOCKET_PORT or 4000. */
const LISTEN_PORT = Number(
  process.env.PORT || process.env.SOCKET_PORT || 4000,
);

/** Browser origins allowed for REST + Socket.io. Local dev allows both hostname styles. */
function socketCorsOrigins(): string[] {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  if (!/localhost|127\.0\.0\.1/.test(appUrl)) {
    return [appUrl];
  }
  return [
    ...new Set([
      appUrl,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]),
  ];
}

const ALLOWED_ORIGINS = socketCorsOrigins();

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true, service: "drawly-socket" }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 5e6,
});

const rooms = new RoomManager();

function broadcastRoom(code: string) {
  const room = rooms.getRoom(code);
  if (!room) return;
  io.to(code).emit("room:state", rooms.publicState(room));
}

type Sock = Socket & {
  data: { roomCode?: string; playerId?: string };
};

io.on("connection", (socket: Sock) => {
  socket.on(
    "room:create",
    (
      payload: {
        player: { id: string; name: string; emoji: string; color: string };
      },
      ack?: (r: unknown) => void,
    ) => {
      const p = payload?.player;
      if (!p?.id || !p?.name?.trim()) {
        ack?.({ ok: false, error: "Invalid player" });
        return;
      }
      const room = rooms.createRoom(socket.id, {
        id: p.id,
        name: p.name.trim(),
        emoji: p.emoji || "🎨",
        color: p.color || "#a78bfa",
      });
      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.playerId = p.id;
      const state = rooms.publicState(room);
      ack?.({ ok: true, state });
      io.to(room.code).emit("room:state", state);
    },
  );

  socket.on(
    "room:join",
    (
      payload: {
        code: string;
        player: { id: string; name: string; emoji: string; color: string };
      },
      ack?: (r: unknown) => void,
    ) => {
      const code = payload?.code?.toUpperCase()?.trim();
      const p = payload?.player;
      if (!code || !p?.id || !p?.name?.trim()) {
        ack?.({ ok: false, error: "Invalid join" });
        return;
      }
      const result = rooms.joinRoom(code, socket.id, {
        id: p.id,
        name: p.name.trim(),
        emoji: p.emoji || "🎨",
        color: p.color || "#a78bfa",
      });
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      socket.join(result.room.code);
      socket.data.roomCode = result.room.code;
      socket.data.playerId = p.id;
      const state = rooms.publicState(result.room);
      ack?.({ ok: true, state });
      io.to(result.room.code).emit("room:state", state);
    },
  );

  socket.on("room:leave", () => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = rooms.leaveRoom(code, socket.id);
    socket.leave(code);
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
    if (room) broadcastRoom(room.code);
  });

  socket.on(
    "room:ready",
    (payload: { ready: boolean }, ack?: (r: unknown) => void) => {
      const code = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!code || !playerId) {
        ack?.({ ok: false });
        return;
      }
      const room = rooms.setReady(code, playerId, Boolean(payload?.ready));
      if (!room) {
        ack?.({ ok: false });
        return;
      }
      ack?.({ ok: true });
      broadcastRoom(code);
    },
  );

  socket.on(
    "room:profile",
    (payload: { name?: string; emoji?: string; color?: string }) => {
      const code = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!code || !playerId) return;
      const room = rooms.updateProfile(code, playerId, {
        name: payload?.name,
        emoji: payload?.emoji,
        color: payload?.color,
      });
      if (room) broadcastRoom(code);
    },
  );

  socket.on(
    "room:settings",
    (payload: Partial<import("../src/lib/game-types").RoomSettings>) => {
      const code = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!code || !playerId) return;
      const room = rooms.updateSettings(code, playerId, payload);
      if (room) broadcastRoom(code);
    },
  );

  socket.on("game:start", (ack?: (r: unknown) => void) => {
    const code = socket.data.roomCode as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    if (!code || !playerId) {
      ack?.({ ok: false, error: "Not in a room" });
      return;
    }
    const room = rooms.startGame(code, playerId, io);
    if (!room) {
      ack?.({ ok: false, error: "Cannot start" });
      return;
    }
    ack?.({ ok: true });
  });

  socket.on(
    "game:submit",
    (
      payload: { text?: string; imageDataUrl?: string },
      ack?: (r: unknown) => void,
    ) => {
      const code = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!code || !playerId) {
        ack?.({ ok: false });
        return;
      }
      const room = rooms.getRoom(code);
      if (!room) {
        ack?.({ ok: false });
        return;
      }
      const ok = rooms.submitForRound(
        room,
        playerId,
        { text: payload?.text, imageDataUrl: payload?.imageDataUrl },
        io,
      );
      ack?.({ ok });
    },
  );

  socket.on(
    "reveal:navigate",
    (payload: { bookIdx: number | null; page: number }) => {
      const code = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!code || !playerId) return;
      rooms.setRevealNav(
        code,
        playerId,
        {
          bookIdx: payload?.bookIdx ?? null,
          page: typeof payload?.page === "number" ? payload.page : 0,
        },
        io,
      );
    },
  );

  socket.on("disconnect", () => {
    const hit = rooms.disconnectSocket(socket.id);
    if (hit) {
      io.to(hit.code).emit("room:state", rooms.publicState(hit.room));
    }
  });
});

httpServer.listen(LISTEN_PORT, () => {
  console.log(
    `Drawly socket server on :${LISTEN_PORT} (CORS: ${ALLOWED_ORIGINS.join(", ")})`,
  );
});
