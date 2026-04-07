export type GamePhase = "lobby" | "playing" | "reveal";

export type SegmentKind = "prompt" | "draw" | "describe";

export interface PublicPlayer {
  id: string;
  name: string;
  emoji: string;
  color: string;
  ready: boolean;
  isHost: boolean;
}

export interface ChainEntry {
  segmentIndex: number;
  kind: SegmentKind;
  playerId: string;
  playerName: string;
  text?: string;
  imageDataUrl?: string;
}

export interface RoomSettings {
  rounds: number;
  drawSeconds: number;
  describeSeconds: number;
  describeMaxChars: number;
}

export interface PublicRoomState {
  code: string;
  phase: GamePhase;
  hostId: string;
  players: PublicPlayer[];
  settings: RoomSettings;
  /** Current step in the chain (0 .. settings.rounds - 1) */
  currentSegment: number;
  turnEndsAt: number | null;
  activePlayerId: string | null;
  /** Completed steps only; current turn content is not included until submitted */
  chain: ChainEntry[];
}

export function segmentKind(segmentIndex: number): SegmentKind {
  if (segmentIndex === 0) return "prompt";
  return segmentIndex % 2 === 1 ? "draw" : "describe";
}

export const DEFAULT_SETTINGS: RoomSettings = {
  rounds: 8,
  drawSeconds: 75,
  describeSeconds: 60,
  describeMaxChars: 280,
};

/** Min 1 so you can test solo; same player takes every turn in the chain. */
export const PLAYER_LIMITS = { min: 1, max: 8 } as const;
export const ROUND_LIMITS = { min: 6, max: 10 } as const;
