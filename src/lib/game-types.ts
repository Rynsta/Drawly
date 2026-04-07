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
  round: number;
  kind: SegmentKind;
  playerId: string;
  playerName: string;
  text?: string;
  imageDataUrl?: string;
  timedOut?: boolean;
}

export interface Book {
  ownerId: string;
  ownerName: string;
  entries: ChainEntry[];
}

export interface BookSummary {
  ownerId: string;
  ownerName: string;
  entryCount: number;
}

export interface Assignment {
  bookIndex: number;
  kind: SegmentKind;
  previousEntry?: ChainEntry;
}

export interface RoomSettings {
  drawSeconds: number;
  describeSeconds: number;
  promptSeconds: number;
  describeMaxChars: number;
}

export interface RevealNav {
  bookIdx: number | null;
  page: number;
}

export interface PublicRoomState {
  code: string;
  phase: GamePhase;
  hostId: string;
  players: PublicPlayer[];
  settings: RoomSettings;
  currentRound: number;
  totalRounds: number;
  turnEndsAt: number | null;
  pendingPlayerIds: string[];
  books: Book[];
  bookSummaries: BookSummary[];
  revealNav: RevealNav;
}

export function roundKind(round: number): SegmentKind {
  if (round === 0) return "prompt";
  return round % 2 === 1 ? "draw" : "describe";
}

export const DEFAULT_SETTINGS: RoomSettings = {
  drawSeconds: 75,
  describeSeconds: 60,
  promptSeconds: 60,
  describeMaxChars: 280,
};

export const PLAYER_LIMITS = { min: 1, max: 8 } as const;
