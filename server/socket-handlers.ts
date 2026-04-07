import type { Server, Socket } from "socket.io";
import type { RoomSettings } from "../src/lib/game-types";
import type { RoomManager } from "./engine";

type Sock = Socket & {
  data: { roomCode?: string; playerId?: string };
};

export function registerDrawlySocketHandlers(
  io: Server,
  rooms: RoomManager,
) {
  function broadcastRoom(code: string) {
    const room = rooms.getRoom(code);
    if (!room) return;
    io.to(code).emit("room:state", rooms.publicState(room));
  }

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
      (payload: Partial<RoomSettings>) => {
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
}
