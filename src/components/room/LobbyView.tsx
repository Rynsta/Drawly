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
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-fuchsia-300/80">
            Lobby
          </p>
          <h1 className="text-gradient-brand mt-1 text-4xl font-bold tracking-tight md:text-5xl">
            Drawly
          </h1>
          <p className="mt-2 max-w-lg text-sm text-zinc-400">
            {socketConnected ? (
              <>
                Room{" "}
                <button
                  type="button"
                  onClick={copyCode}
                  className="font-mono text-cyan-300 underline decoration-dotted underline-offset-4 hover:text-cyan-200"
                >
                  {room.code}
                </button>
                — share the code so friends can join.
              </>
            ) : (
              <span className="text-amber-300/90">Connecting to server…</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              leaveRoom();
              router.push("/");
            }}
          >
            Leave
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-lg font-semibold text-white">Your profile</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              Display name
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-deep/80 px-3 py-2 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
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
              <p className="text-xs text-zinc-500">Emoji</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={cn(
                      "rounded-lg p-1.5 text-lg hover:bg-white/10",
                      player.emoji === em && "bg-white/15 ring-1 ring-violet-400/50",
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
            <p className="text-xs text-zinc-500">Accent</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  className={cn(
                    "h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-night",
                    player.color === c ? "ring-white" : "ring-transparent",
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
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant={me?.ready ? "secondary" : "primary"}
              onClick={async () => {
                await setReady(!me?.ready);
              }}
            >
              {me?.ready ? "Unready" : "Ready up"}
            </Button>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-white">Room settings</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {PLAYER_LIMITS.min}–{PLAYER_LIMITS.max} players
          </p>
          <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
            <p className="text-sm text-violet-100">
              Each player starts a book. Books rotate every round —{" "}
              <span className="font-semibold text-white">
                {room.players.length} player{room.players.length !== 1 ? "s" : ""} = {room.players.length} round{room.players.length !== 1 ? "s" : ""}
              </span>
            </p>
          </div>
          <div className="mt-4 grid gap-4">
            <label className="block text-xs text-zinc-500">
              Prompt time (seconds)
              <input
                type="range"
                min={30}
                max={120}
                disabled={!isHost}
                value={room.settings.promptSeconds}
                onChange={(e) =>
                  updateSettings({ promptSeconds: Number(e.target.value) })
                }
                className="mt-2 w-full accent-violet-500"
              />
              <span className="text-sm text-zinc-300">
                {room.settings.promptSeconds}s
              </span>
            </label>
            <label className="block text-xs text-zinc-500">
              Draw time (seconds)
              <input
                type="range"
                min={45}
                max={120}
                disabled={!isHost}
                value={room.settings.drawSeconds}
                onChange={(e) =>
                  updateSettings({ drawSeconds: Number(e.target.value) })
                }
                className="mt-2 w-full accent-cyan-500"
              />
              <span className="text-sm text-zinc-300">
                {room.settings.drawSeconds}s
              </span>
            </label>
            <label className="block text-xs text-zinc-500">
              Describe time (seconds)
              <input
                type="range"
                min={30}
                max={120}
                disabled={!isHost}
                value={room.settings.describeSeconds}
                onChange={(e) =>
                  updateSettings({ describeSeconds: Number(e.target.value) })
                }
                className="mt-2 w-full accent-fuchsia-500"
              />
              <span className="text-sm text-zinc-300">
                {room.settings.describeSeconds}s
              </span>
            </label>
          </div>
          <div className="mt-6">
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
              {isHost ? "Start game" : "Waiting for host"}
            </Button>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-lg font-semibold text-white">
          Players ({room.players.length}/{PLAYER_LIMITS.max})
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {room.players.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-night-deep/50 px-3 py-2"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: `${p.color}33` }}
              >
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                  {p.name}
                  {p.isHost && (
                    <span className="ml-2 text-xs text-violet-300">Host</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  {p.ready ? "Ready" : "Not ready"}
                </p>
              </div>
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  p.ready ? "bg-emerald-400 shadow-glow-cyan" : "bg-zinc-600",
                )}
              />
            </motion.li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
