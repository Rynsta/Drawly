/**
 * Verifies submit rules used when time runs out: partial text and canvas PNG
 * data URLs are accepted (no 2-char minimum, relaxed image prefix check).
 *
 * Run: npx tsx server/scripts/verify-timeout-submit.ts
 */
import type { Server } from "socket.io";
import { roundKind } from "../../src/lib/game-types";
import { RoomManager } from "../engine";

function mockIo(): Server {
  return {
    to: () => ({ emit: () => {} }),
  } as unknown as Server;
}

/** 1×1 PNG (base64), well above server minimum length */
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAKmKmWQAAAABJRU5ErkJggg==";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const io = mockIo();
  const rm = new RoomManager();

  const host = rm.createRoom("sock-host", {
    id: "p-host",
    name: "Host",
    emoji: "🎮",
    color: "#fff",
  });
  const join = rm.joinRoom(host.code, "sock-guest", {
    id: "p-guest",
    name: "Guest",
    emoji: "🎨",
    color: "#000",
  });
  assert(join.ok, "join");

  const room = rm.getRoom(host.code)!;
  room.players[0].ready = true;
  room.players[1].ready = true;

  const started = rm.startGame(host.code, "p-host", io);
  assert(started != null && started.phase === "playing", "start game");
  assert(room.currentRound === 0, "round 0 prompt");

  // Single-character prompt must succeed (used on deadline auto-submit).
  const okOneChar = rm.submitForRound(room, "p-host", { text: "a" }, io);
  assert(okOneChar, "1-char prompt submit");

  const okEmpty = rm.submitForRound(room, "p-guest", { text: "" }, io);
  assert(okEmpty, "empty prompt submit");

  assert(room.currentRound === 1, "advanced to draw");
  assert(roundKind(room.currentRound) === "draw", "draw round");

  const okDraw = rm.submitForRound(room, "p-host", { imageDataUrl: TINY_PNG }, io);
  assert(okDraw, "tiny PNG draw submit");

  const okDraw2 = rm.submitForRound(room, "p-guest", { imageDataUrl: TINY_PNG }, io);
  assert(okDraw2, "second draw submit");

  assert(room.currentRound === 2, "advanced to describe");

  const badImage = rm.submitForRound(room, "p-host", { imageDataUrl: "not-an-image" }, io);
  assert(!badImage, "reject non-data-url image");

  console.log("verify-timeout-submit: all checks passed");
}

main();
