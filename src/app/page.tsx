"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DrawlyDrawnTitle } from "@/components/home/DrawlyDrawnTitle";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useDrawlyStore } from "@/lib/store";
import { getSocketUrl } from "@/lib/socket-client";
import { PLAYER_LIMITS } from "@/lib/game-types";
import { sfxError, sfxSuccess } from "@/lib/sfx";
import { hapticSuccess } from "@/lib/haptics";

const SOCKET_HELP_DELAY_MS = 1200;

export default function HomePage() {
  const router = useRouter();
  const createRoom = useDrawlyStore((s) => s.createRoom);
  const joinRoom = useDrawlyStore((s) => s.joinRoom);
  const player = useDrawlyStore((s) => s.player);
  const setPlayer = useDrawlyStore((s) => s.setPlayer);
  const socketConnected = useDrawlyStore((s) => s.socketConnected);
  const lastError = useDrawlyStore((s) => s.lastError);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [socketHelpReady, setSocketHelpReady] = useState(false);

  useEffect(() => {
    if (socketConnected) {
      setSocketHelpReady(false);
      return;
    }
    const id = window.setTimeout(
      () => setSocketHelpReady(true),
      SOCKET_HELP_DELAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [socketConnected]);

  const showSocketTrouble =
    !socketConnected && (socketHelpReady || lastError != null);

  const onCreate = async () => {
    if (!player.name.trim()) {
      sfxError();
      return;
    }
    setBusy("create");
    try {
      const state = await createRoom();
      sfxSuccess();
      hapticSuccess();
      router.push(`/room/${state.code}`);
    } catch {
      sfxError();
    } finally {
      setBusy(null);
    }
  };

  const onJoin = async () => {
    if (!player.name.trim() || joinCode.trim().length < 4) {
      sfxError();
      return;
    }
    setBusy("join");
    try {
      const state = await joinRoom(joinCode.trim());
      sfxSuccess();
      hapticSuccess();
      router.push(`/room/${state.code}`);
    } catch {
      sfxError();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-page min-h-dvh">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-14 md:pt-20">
        <header className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-semibold uppercase tracking-[0.25em] text-fuchsia-300/90"
          >
            Party game
          </motion.p>
          <DrawlyDrawnTitle />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 text-lg leading-relaxed text-zinc-400 md:text-xl"
          >
            A drawing-and-guessing chain for your crew —{" "}
            <span className="text-transparent bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text">
              draw the prompt, describe the doodle
            </span>
            , then flip the reveal.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button
              disabled={busy !== null || !socketConnected}
              onClick={onCreate}
            >
              {busy === "create" ? "Creating…" : "Create room"}
            </Button>
            <a href="#join">
              <Button variant="secondary">Join room</Button>
            </a>
          </motion.div>
          {!socketConnected && !showSocketTrouble && (
            <p className="mt-3 text-xs text-zinc-500">Connecting to game server…</p>
          )}
          {showSocketTrouble && (
            <div className="mt-3 max-w-xl space-y-2 text-sm text-amber-200/85">
              <p>
                Waiting for the realtime server. In the project folder run{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-zinc-100">
                  npm run dev
                </code>{" "}
                so <strong>both</strong> Next.js (port 3000) and the socket (port 4000)
                start — not <code className="text-xs">next dev</code> alone.
              </p>
              <p className="text-xs text-zinc-500">
                Client connects to{" "}
                <code className="rounded bg-white/5 px-1 py-0.5 text-zinc-300">
                  {getSocketUrl()}
                </code>
                . Open this site as{" "}
                <code className="text-zinc-300">http://localhost:3000</code> or{" "}
                <code className="text-zinc-300">http://127.0.0.1:3000</code>
                (both are allowed by default in dev).
              </p>
              {lastError ? (
                <p className="text-xs text-rose-300/90" role="alert">
                  {lastError}
                </p>
              ) : null}
            </div>
          )}
        </header>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <GlassCard id="join">
            <h2 className="text-lg font-semibold text-white">Jump in</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {PLAYER_LIMITS.min}–{PLAYER_LIMITS.max} players · rounds = player count
            </p>
            <label className="mt-4 block text-xs text-zinc-500">
              Your name
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-deep/90 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/30 focus:ring-2"
                placeholder="How should we shout at you?"
                value={player.name}
                onChange={(e) => setPlayer({ name: e.target.value })}
                maxLength={24}
              />
            </label>
            <label className="mt-3 block text-xs text-zinc-500">
              Room code
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-night-deep/90 px-3 py-2.5 font-mono text-sm uppercase tracking-widest text-white outline-none ring-cyan-500/30 focus:ring-2"
                placeholder="ABCDEF"
                value={joinCode}
                maxLength={8}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
            </label>
            <Button
              className="mt-5 w-full sm:w-auto"
              disabled={busy !== null || !socketConnected}
              variant="primary"
              onClick={onJoin}
            >
              {busy === "join" ? "Joining…" : "Join room"}
            </Button>
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold text-white">How it flows</h2>
            <ol className="mt-4 space-y-3 text-sm text-zinc-400">
              <li>
                <span className="font-semibold text-violet-200">1.</span> Player one
                writes a weird text prompt.
              </li>
              <li>
                <span className="font-semibold text-cyan-200">2.</span> Next player
                draws it — no words, just vibes.
              </li>
              <li>
                <span className="font-semibold text-fuchsia-200">3.</span> The next
                person only sees the art and writes a fresh description.
              </li>
              <li>
                <span className="font-semibold text-amber-200">4.</span> Repeat until
                the chain completes, then flip the story and scream-laugh.
              </li>
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
