"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { COLOR_PRESETS, EMOJI_PRESETS } from "@/lib/constants";
import { PLAYER_LIMITS } from "@/lib/game-types";
import { useDrawlyStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { sfxSuccess } from "@/lib/sfx";
import { hapticSuccess } from "@/lib/haptics";

export function LobbyView() {
  const router = useRouter();
  const room = useDrawlyStore((s) => s.room);
  const player = useDrawlyStore((s) => s.player);
  const setPlayer = useDrawlyStore((s) => s.setPlayer);
  const updateProfile = useDrawlyStore((s) => s.updateProfile);
  const setReady = useDrawlyStore((s) => s.setReady);
  const updateSettings = useDrawlyStore((s) => s.updateSettings);
  const startGame = useDrawlyStore((s) => s.startGame);
  const leaveRoom = useDrawlyStore((s) => s.leaveRoom);
  const socketConnected = useDrawlyStore((s) => s.socketConnected);
  const [starting, setStarting] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  if (!room) return null;

  const isHost = room.hostId === player.id;
  const me = room.players.find((p) => p.id === player.id);
  const canStart =
    isHost &&
    room.players.length >= PLAYER_LIMITS.min &&
    room.players.length <= PLAYER_LIMITS.max &&
    room.players.every((p) => p.ready);

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    hapticSuccess();
    sfxSuccess();
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-300/80">
            Lobby
          </p>
          <h1 className="text-gradient-brand mt-1 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Drawly
          </h1>
          {socketConnected ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-zinc-500">
                Share this code with friends
              </p>
              <button
                type="button"
                onClick={copyCode}
                className="group inline-flex items-center gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-3 transition-all hover:border-blue-400/40 hover:bg-blue-500/15"
              >
                <span className="font-mono text-2xl font-bold tracking-[0.25em] text-blue-300 md:text-3xl">
                  {room.code}
                </span>
                <span className="rounded-lg bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/25 transition-colors group-hover:bg-blue-500/25">
                  {codeCopied ? "Copied!" : "Copy"}
                </span>
              </button>
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-orange-300/90">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
              Connecting to server…
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            leaveRoom();
            router.push("/");
          }}
        >
          ← Leave
        </Button>
      </header>

      {/* Profile + Settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <h2 className="font-display text-base font-bold text-white">
              That&apos;s you
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Display name
              </span>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
                value={player.name}
                placeholder="Your name"
                maxLength={24}
                onChange={(e) => {
                  setPlayer({ name: e.target.value });
                  updateProfile({ name: e.target.value });
                }}
              />
            </label>
            <div>
              <p className="mb-1.5 text-xs font-medium text-zinc-400">Emoji</p>
              <div className="flex flex-wrap gap-1">
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={cn(
                      "rounded-lg p-1.5 text-lg transition-all hover:scale-110 hover:bg-white/10",
                      player.emoji === em &&
                        "bg-white/15 ring-1 ring-blue-400/60 shadow-[0_0_12px_rgba(96,165,250,0.25)]",
                    )}
                    onClick={() => {
                      setPlayer({ emoji: em });
                      updateProfile({ emoji: em });
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-zinc-400">
              Accent color
            </p>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-150 hover:scale-110",
                    player.color === c
                      ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#080c16]"
                      : "ring-1 ring-white/10",
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setPlayer({ color: c });
                    updateProfile({ color: c });
                  }}
                />
              ))}
            </div>
          </div>
          <div className="mt-5">
            <Button
              variant={me?.ready ? "secondary" : "primary"}
              onClick={async () => {
                await setReady(!me?.ready);
              }}
            >
              {me?.ready ? "✓ Ready" : "Ready up"}
            </Button>
          </div>
        </GlassCard>

        {/* Game Setup Card */}
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Game setup
              </h2>
              <p className="text-xs text-zinc-500">
                {PLAYER_LIMITS.min}–{PLAYER_LIMITS.max} players
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-blue-500/20 bg-blue-500/[0.08] px-4 py-3">
            <p className="text-sm text-blue-100">
              Everyone starts a book that gets passed around —{" "}
              <span className="font-semibold text-white">
                {room.players.length} player
                {room.players.length !== 1 ? "s" : ""} ={" "}
                {room.players.length} round
                {room.players.length !== 1 ? "s" : ""}
              </span>
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">
                  Prompt time
                </label>
                <span className="rounded-lg bg-blue-500/15 px-2 py-0.5 font-mono text-xs font-bold text-blue-300">
                  {room.settings.promptSeconds}s
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={120}
                disabled={!isHost}
                value={room.settings.promptSeconds}
                onChange={(e) =>
                  updateSettings({ promptSeconds: Number(e.target.value) })
                }
                className="w-full disabled:opacity-40"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">
                  Draw time
                </label>
                <span className="rounded-lg bg-orange-500/15 px-2 py-0.5 font-mono text-xs font-bold text-orange-300">
                  {room.settings.drawSeconds}s
                </span>
              </div>
              <input
                type="range"
                min={45}
                max={120}
                disabled={!isHost}
                value={room.settings.drawSeconds}
                onChange={(e) =>
                  updateSettings({ drawSeconds: Number(e.target.value) })
                }
                className="w-full accent-orange-500 disabled:opacity-40"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">
                  Describe time
                </label>
                <span className="rounded-lg bg-pink-500/15 px-2 py-0.5 font-mono text-xs font-bold text-pink-300">
                  {room.settings.describeSeconds}s
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={120}
                disabled={!isHost}
                value={room.settings.describeSeconds}
                onChange={(e) =>
                  updateSettings({ describeSeconds: Number(e.target.value) })
                }
                className="w-full accent-pink-500 disabled:opacity-40"
              />
            </div>
          </div>

          <div className="mt-6">
            {isHost ? (
              <Button
                disabled={!canStart || starting}
                onClick={async () => {
                  setStarting(true);
                  const ok = await startGame();
                  setStarting(false);
                  if (ok) {
                    sfxSuccess();
                    hapticSuccess();
                  }
                }}
              >
                {starting
                  ? "Starting…"
                  : canStart
                    ? "🚀 Start game"
                    : "Waiting for everyone…"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                Waiting for host to start…
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Players List */}
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white">
            Who&apos;s here
          </h2>
          <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10">
            {room.players.length} / {PLAYER_LIMITS.max}
          </span>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {room.players.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative flex items-center gap-3 overflow-hidden rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.07]"
              style={{
                boxShadow: `inset 3px 0 0 ${p.color}60`,
              }}
            >
              {/* Subtle color accent background */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-16 opacity-10"
                style={{
                  background: `linear-gradient(to right, ${p.color}, transparent)`,
                }}
              />
              <span
                className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: `${p.color}22` }}
              >
                {p.emoji}
              </span>
              <div className="relative z-10 min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                  {p.name}
                  {p.isHost && (
                    <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 ring-1 ring-blue-500/30">
                      HOST
                    </span>
                  )}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    p.ready ? "text-emerald-400" : "text-zinc-500",
                  )}
                >
                  {p.ready ? "✓ Ready" : "Not ready"}
                </p>
              </div>
              <span
                className={cn(
                  "relative z-10 h-2.5 w-2.5 shrink-0 rounded-full",
                  p.ready
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                    : "bg-zinc-600",
                )}
              />
            </motion.li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
