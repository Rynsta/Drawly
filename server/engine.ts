import type { Server } from "socket.io";
import {
  type ChainEntry,
  type GamePhase,
  type PublicRoomState,
  type RoomSettings,
  DEFAULT_SETTINGS,
  PLAYER_LIMITS,
  ROUND_LIMITS,
  segmentKind,
} from "../src/lib/game-types";
import { deleteRoomPersisted, loadRoom, persistRoom } from "./redis-store";

/** 1×1 transparent PNG for skipped / timed-out drawings */
const EMPTY_DRAW_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export interface InternalPlayer {
  id: string;
  socketId: string;
  name: string;
  emoji: string;
  color: string;
  ready: boolean;
}

export interface SerializedRoom {
  code: string;
  hostId: string;
  players: InternalPlayer[];
  settings: RoomSettings;
  phase: GamePhase;
  currentSegment: number;
  chain: ChainEntry[];
  turnEndsAt: number | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
}

function sanitizeSettings(s: Partial<RoomSettings>): RoomSettings {
  const rounds = Math.min(
    ROUND_LIMITS.max,
    Math.max(ROUND_LIMITS.min, Math.round(Number(s.rounds) || DEFAULT_SETTINGS.rounds)),
  );
  const drawSeconds = Math.min(
    120,
    Math.max(45, Math.round(Number(s.drawSeconds) || DEFAULT_SETTINGS.drawSeconds)),
  );
  const describeSeconds = Math.min(
    120,
    Math.max(30, Math.round(Number(s.describeSeconds) || DEFAULT_SETTINGS.describeSeconds)),
  );
  const describeMaxChars = Math.min(
    500,
    Math.max(40, Math.round(Number(s.describeMaxChars) || DEFAULT_SETTINGS.describeMaxChars)),
  );
  return { rounds, drawSeconds, describeSeconds, describeMaxChars };
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export class RoomManager {
  private rooms = new Map<string, SerializedRoom>();

  constructor() {
    // optional hydrate from env not implemented; rooms are created fresh
  }

  private async save(room: SerializedRoom) {
    const { turnTimer: _t, ...rest } = room;
    await persistRoom(room.code, { ...rest, turnTimer: null });
  }

  async tryLoadFromRedis(code: string): Promise<SerializedRoom | null> {
    const data = await loadRoom(code);
    if (!data) return null;
    const room: SerializedRoom = { ...data, turnTimer: null };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): SerializedRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  private clearTurnTimer(room: SerializedRoom) {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
  }

  private toPublic(room: SerializedRoom, viewerId?: string): PublicRoomState {
    const players = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      ready: p.ready,
      isHost: p.id === room.hostId,
    }));
    const n = room.players.length;
    const activePlayerId =
      room.phase === "playing" && n > 0
        ? room.players[room.currentSegment % n]?.id ?? null
        : null;

    const chain = [...room.chain];

    return {
      code: room.code,
      phase: room.phase,
      hostId: room.hostId,
      players,
      settings: room.settings,
      currentSegment: room.currentSegment,
      turnEndsAt: room.turnEndsAt,
      activePlayerId,
      chain,
    };
  }

  /** Extra hint for drawer/describer: previous step payload */
  getPreviousPayload(room: SerializedRoom): { text?: string; imageDataUrl?: string } {
    const last = room.chain[room.chain.length - 1];
    if (!last) return {};
    if (last.kind === "prompt" || last.kind === "describe") return { text: last.text };
    return { imageDataUrl: last.imageDataUrl };
  }

  publicState(room: SerializedRoom, viewerId?: string): PublicRoomState {
    return this.toPublic(room, viewerId);
  }

  createRoom(socketId: string, player: Omit<InternalPlayer, "socketId" | "ready">): SerializedRoom {
    let code = randomCode();
    while (this.rooms.has(code)) code = randomCode();
    const room: SerializedRoom = {
      code,
      hostId: player.id,
      players: [{ ...player, socketId, ready: false }],
      settings: { ...DEFAULT_SETTINGS },
      phase: "lobby",
      currentSegment: 0,
      chain: [],
      turnEndsAt: null,
      turnTimer: null,
    };
    this.rooms.set(code, room);
    void this.save(room);
    return room;
  }

  joinRoom(
    code: string,
    socketId: string,
    player: Omit<InternalPlayer, "socketId" | "ready">,
  ): { ok: true; room: SerializedRoom } | { ok: false; error: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: "Room not found" };
    const existing = room.players.find((p) => p.id === player.id);
    if (existing) {
      existing.socketId = socketId;
      void this.save(room);
      return { ok: true, room };
    }
    if (room.phase !== "lobby") return { ok: false, error: "Game already started" };
    if (room.players.length >= PLAYER_LIMITS.max)
      return { ok: false, error: "Room is full" };
    room.players.push({ ...player, socketId, ready: false });
    void this.save(room);
    return { ok: true, room };
  }

  leaveRoom(code: string, socketId: string): SerializedRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return null;
    const leaver = room.players.find((p) => p.socketId === socketId);
    if (!leaver) return room;
    if (room.phase === "lobby") {
      room.players = room.players.filter((p) => p.socketId !== socketId);
    } else {
      leaver.socketId = "";
    }
    if (room.players.length === 0) {
      this.clearTurnTimer(room);
      this.rooms.delete(room.code);
      void deleteRoomPersisted(room.code);
      return null;
    }
    if (room.hostId && !room.players.some((p) => p.id === room.hostId)) {
      room.hostId = room.players.find((p) => p.socketId)?.id ?? room.players[0].id;
    }
    void this.save(room);
    return room;
  }

  disconnectSocket(socketId: string): { code: string; room: SerializedRoom } | null {
    for (const room of this.rooms.values()) {
      const p = room.players.find((x) => x.socketId === socketId);
      if (p) {
        const c = room.code;
        const updated = this.leaveRoom(c, socketId);
        if (!updated) return null;
        return { code: c, room: updated };
      }
    }
    return null;
  }

  setReady(code: string, playerId: string, ready: boolean): SerializedRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.phase !== "lobby") return null;
    const p = room.players.find((x) => x.id === playerId);
    if (!p) return null;
    p.ready = ready;
    void this.save(room);
    return room;
  }

  updateProfile(
    code: string,
    playerId: string,
    patch: Partial<Pick<InternalPlayer, "name" | "emoji" | "color">>,
  ): SerializedRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.phase !== "lobby") return null;
    const p = room.players.find((x) => x.id === playerId);
    if (!p) return null;
    if (patch.name != null) p.name = patch.name.slice(0, 24);
    if (patch.emoji != null) p.emoji = patch.emoji.slice(0, 8);
    if (patch.color != null) p.color = patch.color;
    void this.save(room);
    return room;
  }

  updateSettings(
    code: string,
    hostId: string,
    partial: Partial<RoomSettings>,
  ): SerializedRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.hostId !== hostId || room.phase !== "lobby") return null;
    room.settings = sanitizeSettings({ ...room.settings, ...partial });
    void this.save(room);
    return room;
  }

  private scheduleTurnEnd(room: SerializedRoom, io: Server) {
    this.clearTurnTimer(room);
    const n = room.players.length;
    if (n === 0) return;
    const kind = segmentKind(room.currentSegment);
    const sec =
      kind === "describe" || kind === "prompt"
        ? room.settings.describeSeconds
        : room.settings.drawSeconds;
    const ends = Date.now() + sec * 1000;
    room.turnEndsAt = ends;
    room.turnTimer = setTimeout(() => {
      this.advanceAfterTimeout(room.code, io);
    }, sec * 1000);
  }

  private advanceAfterTimeout(code: string, io: Server) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.phase !== "playing") return;
    const kind = segmentKind(room.currentSegment);
    const placeholder =
      kind === "prompt"
        ? "(time ran out — skipped prompt)"
        : kind === "describe"
          ? "(time ran out)"
          : "";
    const pid = room.players[room.currentSegment % room.players.length]?.id;
    if (!pid) return;
    if (kind === "draw") {
      this.submitDraw(room, pid, EMPTY_DRAW_DATA_URL, io, true);
    } else if (kind === "describe") {
      this.submitDescribe(room, pid, placeholder, io, true);
    } else {
      this.submitPrompt(room, pid, placeholder, io, true);
    }
  }

  startGame(code: string, hostId: string, io: Server): SerializedRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.hostId !== hostId || room.phase !== "lobby") return null;
    const n = room.players.length;
    if (n < PLAYER_LIMITS.min || n > PLAYER_LIMITS.max) return null;
    if (!room.players.every((p) => p.ready)) return null;

    shuffleInPlace(room.players);

    room.phase = "playing";
    room.currentSegment = 0;
    room.chain = [];
    room.turnEndsAt = null;
    this.clearTurnTimer(room);
    this.scheduleTurnEnd(room, io);
    void this.save(room);
    io.to(room.code).emit("room:state", this.publicState(room));
    return room;
  }

  submitPrompt(
    room: SerializedRoom,
    playerId: string,
    text: string,
    io: Server,
    fromTimer = false,
  ): boolean {
    if (room.phase !== "playing" || segmentKind(room.currentSegment) !== "prompt") return false;
    const n = room.players.length;
    const active = room.players[room.currentSegment % n];
    if (!active || active.id !== playerId) return false;
    const trimmed = fromTimer ? text : text.trim();
    if (!fromTimer && (trimmed.length < 2 || trimmed.length > room.settings.describeMaxChars))
      return false;

    const entry: ChainEntry = {
      segmentIndex: room.currentSegment,
      kind: "prompt",
      playerId: active.id,
      playerName: active.name,
      text: trimmed,
    };
    room.chain.push(entry);
    this.finishSegment(room, io);
    return true;
  }

  submitDraw(
    room: SerializedRoom,
    playerId: string,
    imageDataUrl: string,
    io: Server,
    fromTimer = false,
  ): boolean {
    if (room.phase !== "playing" || segmentKind(room.currentSegment) !== "draw") return false;
    const n = room.players.length;
    const active = room.players[room.currentSegment % n];
    if (!active || active.id !== playerId) return false;
    const url =
      fromTimer ? EMPTY_DRAW_DATA_URL : imageDataUrl;
    if (!fromTimer && (!imageDataUrl || imageDataUrl.length < 100)) return false;

    const entry: ChainEntry = {
      segmentIndex: room.currentSegment,
      kind: "draw",
      playerId: active.id,
      playerName: active.name,
      imageDataUrl: url,
    };
    room.chain.push(entry);
    this.finishSegment(room, io);
    return true;
  }

  submitDescribe(
    room: SerializedRoom,
    playerId: string,
    text: string,
    io: Server,
    fromTimer = false,
  ): boolean {
    if (room.phase !== "playing" || segmentKind(room.currentSegment) !== "describe") return false;
    const n = room.players.length;
    const active = room.players[room.currentSegment % n];
    if (!active || active.id !== playerId) return false;
    const trimmed = fromTimer ? text : text.trim();
    if (!fromTimer && (trimmed.length < 2 || trimmed.length > room.settings.describeMaxChars))
      return false;

    const entry: ChainEntry = {
      segmentIndex: room.currentSegment,
      kind: "describe",
      playerId: active.id,
      playerName: active.name,
      text: trimmed,
    };
    room.chain.push(entry);
    this.finishSegment(room, io);
    return true;
  }

  private finishSegment(room: SerializedRoom, io: Server) {
    this.clearTurnTimer(room);
    room.currentSegment += 1;
    if (room.currentSegment >= room.settings.rounds) {
      room.phase = "reveal";
      room.turnEndsAt = null;
      io.to(room.code).emit("room:state", this.publicState(room));
      void this.save(room);
      return;
    }
    this.scheduleTurnEnd(room, io);
    void this.save(room);
    io.to(room.code).emit("room:state", this.publicState(room));
  }

  lookupBySocket(socketId: string): { code: string; playerId: string } | null {
    for (const room of this.rooms.values()) {
      const p = room.players.find((x) => x.socketId === socketId);
      if (p) return { code: room.code, playerId: p.id };
    }
    return null;
  }

  bindSocketToPlayer(code: string, playerId: string, socketId: string): SerializedRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return null;
    const p = room.players.find((x) => x.id === playerId);
    if (!p) return null;
    p.socketId = socketId;
    void this.save(room);
    return room;
  }
}
