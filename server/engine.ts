import type { Server } from "socket.io";
import {
  type Assignment,
  type Book,
  type BookSummary,
  type ChainEntry,
  type GamePhase,
  type PublicRoomState,
  type RevealNav,
  type RoomSettings,
  DEFAULT_SETTINGS,
  PLAYER_LIMITS,
  roundKind,
} from "../src/lib/game-types";
import { deleteRoomPersisted, loadRoom, persistRoom } from "./redis-store";

/** Extra seconds after the visible timer reaches zero before the server force-submits. */
const TIMER_GRACE_SEC = 4;

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
  currentRound: number;
  totalRounds: number;
  books: Book[];
  pendingPlayers: string[];
  turnEndsAt: number | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
  revealNav: RevealNav;
}

function sanitizeSettings(s: Partial<RoomSettings>): RoomSettings {
  const drawSeconds = Math.min(
    120,
    Math.max(45, Math.round(Number(s.drawSeconds) || DEFAULT_SETTINGS.drawSeconds)),
  );
  const describeSeconds = Math.min(
    120,
    Math.max(30, Math.round(Number(s.describeSeconds) || DEFAULT_SETTINGS.describeSeconds)),
  );
  const promptSeconds = Math.min(
    120,
    Math.max(30, Math.round(Number(s.promptSeconds) || DEFAULT_SETTINGS.promptSeconds)),
  );
  const describeMaxChars = Math.min(
    500,
    Math.max(40, Math.round(Number(s.describeMaxChars) || DEFAULT_SETTINGS.describeMaxChars)),
  );
  return { drawSeconds, describeSeconds, promptSeconds, describeMaxChars };
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * For round `r`, player at index `pIdx` works on book `(pIdx + r) % n`.
 * Round 0: everyone works on their own book (prompt).
 */
function bookIndexForPlayer(playerIndex: number, round: number, n: number): number {
  return (playerIndex + round) % n;
}

export class RoomManager {
  private rooms = new Map<string, SerializedRoom>();

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

  private playerIndex(room: SerializedRoom, playerId: string): number {
    return room.players.findIndex((p) => p.id === playerId);
  }

  getAssignment(room: SerializedRoom, playerId: string): Assignment | null {
    if (room.phase !== "playing") return null;
    const pIdx = this.playerIndex(room, playerId);
    if (pIdx < 0) return null;
    const n = room.players.length;
    const bIdx = bookIndexForPlayer(pIdx, room.currentRound, n);
    const kind = roundKind(room.currentRound);
    const book = room.books[bIdx];
    const prevEntry =
      book && book.entries.length > 0
        ? book.entries[book.entries.length - 1]
        : undefined;
    return { bookIndex: bIdx, kind, previousEntry: prevEntry };
  }

  private toPublic(room: SerializedRoom): PublicRoomState {
    const players = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      ready: p.ready,
      isHost: p.id === room.hostId,
    }));

    const bookSummaries: BookSummary[] = room.books.map((b) => ({
      ownerId: b.ownerId,
      ownerName: b.ownerName,
      entryCount: b.entries.length,
    }));

    const books: Book[] = room.phase === "reveal" ? room.books : [];

    return {
      code: room.code,
      phase: room.phase,
      hostId: room.hostId,
      players,
      settings: room.settings,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      turnEndsAt: room.turnEndsAt,
      pendingPlayerIds: [...room.pendingPlayers],
      books,
      bookSummaries,
      revealNav: room.revealNav,
    };
  }

  publicState(room: SerializedRoom): PublicRoomState {
    return this.toPublic(room);
  }

  createRoom(
    socketId: string,
    player: Omit<InternalPlayer, "socketId" | "ready">,
  ): SerializedRoom {
    let code = randomCode();
    while (this.rooms.has(code)) code = randomCode();
    const room: SerializedRoom = {
      code,
      hostId: player.id,
      players: [{ ...player, socketId, ready: false }],
      settings: { ...DEFAULT_SETTINGS },
      phase: "lobby",
      currentRound: 0,
      totalRounds: 0,
      books: [],
      pendingPlayers: [],
      turnEndsAt: null,
      turnTimer: null,
      revealNav: { bookIdx: null, page: 0 },
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
      room.hostId =
        room.players.find((p) => p.socketId)?.id ?? room.players[0].id;
    }
    void this.save(room);
    return room;
  }

  disconnectSocket(
    socketId: string,
  ): { code: string; room: SerializedRoom } | null {
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

  setReady(
    code: string,
    playerId: string,
    ready: boolean,
  ): SerializedRoom | null {
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

  /** Schedule the end-of-round timer. The visible timer shows `sec` seconds,
   *  but the server waits an extra TIMER_GRACE_SEC so client auto-submits
   *  have time to arrive before the server inserts placeholders. */
  private scheduleTurnEnd(room: SerializedRoom, io: Server) {
    this.clearTurnTimer(room);
    const kind = roundKind(room.currentRound);
    const sec =
      kind === "prompt"
        ? room.settings.promptSeconds
        : kind === "draw"
          ? room.settings.drawSeconds
          : room.settings.describeSeconds;
    const ends = Date.now() + sec * 1000;
    room.turnEndsAt = ends;
    room.turnTimer = setTimeout(() => {
      this.handleTimerExpiry(room.code, io);
    }, (sec + TIMER_GRACE_SEC) * 1000);
  }

  /** Timer fires: auto-submit placeholder for all pending players. */
  private handleTimerExpiry(code: string, io: Server) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.phase !== "playing") return;

    const kind = roundKind(room.currentRound);
    const pending = [...room.pendingPlayers];

    for (const pid of pending) {
      const pIdx = this.playerIndex(room, pid);
      if (pIdx < 0) continue;
      const n = room.players.length;
      const bIdx = bookIndexForPlayer(pIdx, room.currentRound, n);
      const player = room.players[pIdx];

      const entry: ChainEntry = {
        round: room.currentRound,
        kind,
        playerId: pid,
        playerName: player.name,
        timedOut: true,
      };

      if (kind === "draw") {
        entry.text = "(no drawing submitted)";
      } else {
        entry.text = "(time ran out)";
      }

      room.books[bIdx].entries.push(entry);
    }

    room.pendingPlayers = [];
    this.advanceRound(room, io);
  }

  /**
   * Emit `game:assignment` to each connected player.
   */
  emitAssignments(room: SerializedRoom, io: Server) {
    for (const p of room.players) {
      if (!p.socketId) continue;
      const assignment = this.getAssignment(room, p.id);
      if (!assignment) continue;
      io.to(p.socketId).emit("game:assignment", assignment);
    }
  }

  startGame(
    code: string,
    hostId: string,
    io: Server,
  ): SerializedRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.hostId !== hostId || room.phase !== "lobby") return null;
    const n = room.players.length;
    if (n < PLAYER_LIMITS.min || n > PLAYER_LIMITS.max) return null;
    if (!room.players.every((p) => p.ready)) return null;

    shuffleInPlace(room.players);

    room.phase = "playing";
    room.currentRound = 0;
    room.totalRounds = n;
    room.books = room.players.map((p) => ({
      ownerId: p.id,
      ownerName: p.name,
      entries: [],
    }));
    room.pendingPlayers = room.players.map((p) => p.id);
    room.turnEndsAt = null;
    this.clearTurnTimer(room);
    this.scheduleTurnEnd(room, io);

    void this.save(room);
    io.to(room.code).emit("room:state", this.publicState(room));
    this.emitAssignments(room, io);
    return room;
  }

  /**
   * Unified submit: player submits content for their current assignment.
   */
  submitForRound(
    room: SerializedRoom,
    playerId: string,
    content: { text?: string; imageDataUrl?: string },
    io: Server,
  ): boolean {
    if (room.phase !== "playing") return false;
    if (!room.pendingPlayers.includes(playerId)) return false;

    const pIdx = this.playerIndex(room, playerId);
    if (pIdx < 0) return false;

    const n = room.players.length;
    const bIdx = bookIndexForPlayer(pIdx, room.currentRound, n);
    const kind = roundKind(room.currentRound);
    const player = room.players[pIdx];

    if (kind === "draw") {
      const u = content.imageDataUrl ?? "";
      if (
        u.length < 50 ||
        !u.startsWith("data:image/") ||
        !u.includes("base64,")
      )
        return false;
    } else {
      const trimmed = (content.text ?? "").trim();
      if (trimmed.length > room.settings.describeMaxChars) return false;
    }

    const entry: ChainEntry = {
      round: room.currentRound,
      kind,
      playerId,
      playerName: player.name,
    };

    if (kind === "draw") {
      entry.imageDataUrl = content.imageDataUrl;
    } else {
      entry.text = (content.text ?? "").trim();
    }

    room.books[bIdx].entries.push(entry);
    room.pendingPlayers = room.pendingPlayers.filter((id) => id !== playerId);

    if (room.pendingPlayers.length === 0) {
      this.advanceRound(room, io);
    } else {
      void this.save(room);
      io.to(room.code).emit("room:state", this.publicState(room));
    }

    return true;
  }

  private advanceRound(room: SerializedRoom, io: Server) {
    this.clearTurnTimer(room);
    room.currentRound += 1;

    if (room.currentRound >= room.totalRounds) {
      room.phase = "reveal";
      room.turnEndsAt = null;
      room.pendingPlayers = [];
      io.to(room.code).emit("room:state", this.publicState(room));
      void this.save(room);
      return;
    }

    room.pendingPlayers = room.players.map((p) => p.id);
    this.scheduleTurnEnd(room, io);

    void this.save(room);
    io.to(room.code).emit("room:state", this.publicState(room));
    this.emitAssignments(room, io);
  }

  setRevealNav(
    code: string,
    hostId: string,
    nav: RevealNav,
    io: Server,
  ): boolean {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.phase !== "reveal" || room.hostId !== hostId) return false;
    room.revealNav = nav;
    io.to(room.code).emit("reveal:nav", nav);
    void this.save(room);
    return true;
  }

  lookupBySocket(
    socketId: string,
  ): { code: string; playerId: string } | null {
    for (const room of this.rooms.values()) {
      const p = room.players.find((x) => x.socketId === socketId);
      if (p) return { code: room.code, playerId: p.id };
    }
    return null;
  }

  bindSocketToPlayer(
    code: string,
    playerId: string,
    socketId: string,
  ): SerializedRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return null;
    const p = room.players.find((x) => x.id === playerId);
    if (!p) return null;
    p.socketId = socketId;
    void this.save(room);
    return room;
  }
}
