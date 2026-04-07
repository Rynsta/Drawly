"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DrawlyDrawnTitle } from "@/components/home/DrawlyDrawnTitle";
import { FloatingParticles } from "@/components/home/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useDrawlyStore } from "@/lib/store";
import { getSocketUrl } from "@/lib/socket-client";
import { PLAYER_LIMITS } from "@/lib/game-types";
import { sfxError, sfxSuccess } from "@/lib/sfx";
import { hapticSuccess } from "@/lib/haptics";

const SOCKET_HELP_DELAY_MS = 1200;

const STEPS = [
  {
    n: "1",
    color: "text-violet-300",
    ring: "ring-violet-500/40",
    bg: "bg-violet-500/15",
    text: "Someone writes a weird prompt.",
  },
  {
    n: "2",
    color: "text-fuchsia-300",
    ring: "ring-fuchsia-500/40",
    bg: "bg-fuchsia-500/15",
    text: "Next person draws it. No words, just vibes.",
  },
  {
    n: "3",
    color: "text-pink-300",
    ring: "ring-pink-500/40",
    bg: "bg-pink-500/15",
    text: "They only see the drawing and write what they think it is.",
  },
  {
    n: "4",
    color: "text-amber-300",
    ring: "ring-amber-500/40",
    bg: "bg-amber-500/15",
    text: "Keep going until everyone's had a turn, then watch it all go wrong.",
  },
];

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
    <div className="bg-page relative min-h-dvh">
      <FloatingParticles />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-14 md:pt-24">
        <header className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-pink-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-pink-300 ring-1 ring-pink-500/25"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
            Party game
          </motion.p>
          <DrawlyDrawnTitle />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 max-w-lg text-lg leading-relaxed text-zinc-400 md:text-xl"
          >
            Draw something goofy, pass it on, and watch the chaos unfold.
          </motion.p>
          {!socketConnected && !showSocketTrouble && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
              Connecting…
            </p>
          )}
          {showSocketTrouble && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 max-w-xl space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-200/85"
            >
              <p>
                Waiting for the realtime server. In the project folder run{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-zinc-100">
                  npm run dev
                </code>{" "}
                so <strong>both</strong> Next.js (port 3000) and the socket
                (port 4000) start — not{" "}
                <code className="text-xs">next dev</code> alone.
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
            </motion.div>
          )}
        </header>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Join / Create card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <GlassCard id="join">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-2xl">🎮</span>
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    Let&apos;s go
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {PLAYER_LIMITS.min}–{PLAYER_LIMITS.max} friends · one round
                    per player
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-400">
                    Your name
                  </span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.18)]"
                    placeholder="What do your friends call you?"
                    value={player.name}
                    onChange={(e) => setPlayer({ name: e.target.value })}
                    maxLength={24}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-400">
                    Room code
                  </span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 font-mono text-sm uppercase tracking-widest text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-500/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.18)]"
                    placeholder="ABCDEF"
                    value={joinCode}
                    maxLength={8}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  disabled={busy !== null || !socketConnected}
                  variant="primary"
                  onClick={onJoin}
                >
                  {busy === "join" ? "Joining…" : "Join room"}
                </Button>
                <Button
                  disabled={busy !== null || !socketConnected}
                  variant="secondary"
                  onClick={onCreate}
                >
                  {busy === "create" ? "Creating…" : "Create room"}
                </Button>
              </div>
            </GlassCard>
          </motion.div>

          {/* How to play card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <GlassCard>
              <div className="mb-5 flex items-center gap-2">
                <span className="text-2xl">📖</span>
                <h2 className="font-display text-lg font-bold text-white">
                  How to play
                </h2>
              </div>
              <ol className="space-y-3">
                {STEPS.map((step) => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ${step.color} ${step.bg} ${step.ring}`}
                    >
                      {step.n}
                    </span>
                    <span className="text-sm leading-relaxed text-zinc-300">
                      {step.text}
                    </span>
                  </li>
                ))}
              </ol>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
