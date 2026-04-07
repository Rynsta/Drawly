import type { Socket } from "socket.io-client";
import type { PublicRoomState } from "./game-types";

let socket: Socket | null = null;

export function getSocketUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
}

export function getSocket(): Socket {
  if (typeof window === "undefined") {
    return null as unknown as Socket;
  }
  if (socket?.connected) return socket;
  if (socket) return socket;
  const { io } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("socket.io-client") as typeof import("socket.io-client");
  socket = io(getSocketUrl(), {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 800,
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export type RoomCreateAck =
  | { ok: true; state: PublicRoomState }
  | { ok: false; error?: string };

export type RoomJoinAck =
  | { ok: true; state: PublicRoomState }
  | { ok: false; error?: string };
