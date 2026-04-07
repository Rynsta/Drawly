"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { DrawingCanvas } from "@/components/draw/DrawingCanvas";
import { ImagePreview } from "@/components/room/ImagePreview";
import { TurnTimer } from "@/components/room/TurnTimer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDrawlyStore } from "@/lib/store";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { sfxError, sfxSuccess } from "@/lib/sfx";
import { hapticSuccess } from "@/lib/haptics";

const AUTO_SUBMIT_BUFFER_MS = 3500;

const PHASE_META = {
  prompt: {
    emoji: "💬",
    label: "Write the first prompt",
    color: "text-violet-200",
    badge: "bg-violet-500/20 text-violet-300 ring-violet-500/30",
    glow: "shadow-[0_0_40px_rgba(139,92,246,0.12)]",
  },
  draw: {
    emoji: "🎨",
    label: "Draw it!",
    color: "text-pink-200",
    badge: "bg-pink-500/20 text-pink-300 ring-pink-500/30",
    glow: "shadow-[0_0_40px_rgba(236,72,153,0.12)]",
  },
  describe: {
    emoji: "🔍",
    label: "What is that?!",
    color: "text-amber-200",
    badge: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.12)]",
  },
} as const;

export function GameView() {
  const room = useDrawlyStore((s) => s.room);
  const player = useDrawlyStore((s) => s.player);
  const assignment = useDrawlyStore((s) => s.assignment);
  const submitted = useDrawlyStore((s) => s.submitted);
  const submit = useDrawlyStore((s) => s.submit);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const isNarrow = useMediaQuery("(max-width: 767px)");
  const canvasExportRef = useRef<(() => string | null) | null>(null);
  const autoSubmitFired = useRef(false);

  const kind = assignment?.kind ?? "prompt";
  const prevEntry = assignment?.previousEntry;
  const meta = PHASE_META[kind];

  useEffect(() => {
    setText("");
    autoSubmitFired.current = false;
  }, [room?.currentRound]);

  useEffect(() => {
    if (!room?.turnEndsAt || submitted || busy) return;
    const check = () => {
      if (autoSubmitFired.current || submitted) return;
      const remaining = (room.turnEndsAt ?? 0) - Date.now();
      if (remaining > AUTO_SUBMIT_BUFFER_MS) return;

      autoSubmitFired.current = true;

      if (kind === "draw") {
        const dataUrl = canvasExportRef.current?.();
        if (dataUrl && dataUrl.length > 100) {
          submit({ imageDataUrl: dataUrl });
        }
      } else {
        const trimmed = text.trim();
        if (trimmed.length >= 2) {
          submit({ text: trimmed });
        }
      }
    };

    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }, [room?.turnEndsAt, submitted, busy, kind, text, submit]);

  if (!room || !assignment) return null;

  const maxChars = room.settings.describeMaxChars;
  const pendingNames = room.players
    .filter((p) => room.pendingPlayerIds.includes(p.id) && p.id !== player.id)
    .map((p) => p.name);

  const onSubmitText = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await submit({ text: text.trim() });
    setBusy(false);
    if (ok) {
      setText("");
      sfxSuccess();
      hapticSuccess();
    } else sfxError();
  };

  const onSubmitDraw = async (dataUrl: string) => {
    if (busy) return;
    setBusy(true);
    const ok = await submit({ imageDataUrl: dataUrl });
    setBusy(false);
    if (ok) {
      sfxSuccess();
      hapticSuccess();
    } else sfxError();
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <GlassCard className="py-14 text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-4 font-display text-xl font-bold text-white">
              You&apos;re done!
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Waiting on the slow ones…
            </p>
            {pendingNames.length > 0 && (
              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-1.5">
                {pendingNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-white/[0.07] px-3 py-1 text-xs text-zinc-400 ring-1 ring-white/10"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${meta.badge}`}
              >
                Round {room.currentRound + 1} / {room.totalRounds}
              </span>
            </div>
            <h2
              className={`font-display text-2xl font-bold tracking-tight ${meta.color}`}
            >
              {meta.label}
            </h2>
          </div>
        </div>
        <TurnTimer endsAt={room.turnEndsAt} />
      </div>

      {/* Prompt phase */}
      {kind === "prompt" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className={meta.glow}>
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">
                Kick things off — keep it short and weird.
              </span>
              <textarea
                className="min-h-[140px] w-full resize-y rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-base text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.18)]"
                maxLength={maxChars}
                value={text}
                placeholder="e.g. A cat trying to parallel park…"
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <div className="mt-2 flex items-center justify-between">
              <Button
                disabled={busy || text.trim().length < 2}
                onClick={onSubmitText}
              >
                Lock it in
              </Button>
              <p className="text-xs tabular-nums text-zinc-500">
                {text.length}/{maxChars}
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Draw phase */}
      {kind === "draw" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isNarrow && (
            <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3">
              <p className="text-sm text-amber-100/90">
                Heads up — drawing on a phone is tricky. Tablet or laptop works
                way better.
              </p>
            </div>
          )}
          <GlassCard className={meta.glow}>
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-4 py-3">
              <span className="mt-0.5 text-lg">💬</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                  Prompt
                </p>
                <p className="mt-0.5 text-base text-violet-100">
                  {prevEntry?.text ?? "—"}
                </p>
              </div>
            </div>
            <ErrorBoundary>
              <DrawingCanvas
                disabled={busy}
                onExport={onSubmitDraw}
                exportRef={canvasExportRef}
              />
            </ErrorBoundary>
          </GlassCard>
        </motion.div>
      )}

      {/* Describe phase */}
      {kind === "describe" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className={meta.glow}>
            {prevEntry?.imageDataUrl ? (
              <ImagePreview
                src={prevEntry.imageDataUrl}
                alt="Previous drawing"
                className="mb-4"
              />
            ) : (
              <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-6 text-center">
                <p className="text-2xl">🤷</p>
                <p className="mt-2 text-sm text-amber-200/80">
                  {prevEntry?.timedOut
                    ? "The last person ran out of time. No drawing came through."
                    : "No drawing to show — just wing it!"}
                </p>
              </div>
            )}
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">
                What do you see? No peeking at the original!
              </span>
              <textarea
                className="min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-base text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-500/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.18)]"
                maxLength={maxChars}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <div className="mt-2 flex items-center justify-between">
              <Button
                disabled={busy || text.trim().length < 2}
                onClick={onSubmitText}
              >
                Send it
              </Button>
              <p className="text-xs tabular-nums text-zinc-500">
                {text.length}/{maxChars}
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {pendingNames.length > 0 && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Still going: {pendingNames.join(", ")}
        </p>
      )}
    </div>
  );
}
