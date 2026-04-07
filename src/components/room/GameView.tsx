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

export function GameView() {
  const room = useDrawlyStore((s) => s.room);
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
    .filter((p) => room.pendingPlayerIds.includes(p.id))
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
        <GlassCard className="py-12 text-center">
          <p className="text-lg font-medium text-zinc-200">
            You&apos;re done! Waiting on the slow ones…
          </p>
          {pendingNames.length > 0 && (
            <p className="mt-2 text-sm text-zinc-500">
              Still going: {pendingNames.join(", ")}
            </p>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-300/80">
            Round {room.currentRound + 1} / {room.totalRounds}
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            {kind === "prompt" && "Write the first prompt"}
            {kind === "draw" && "Draw it!"}
            {kind === "describe" && "What is that?!"}
          </h2>
        </div>
        <TurnTimer endsAt={room.turnEndsAt} />
      </div>

      {kind === "prompt" && (
        <GlassCard>
          <label className="block text-sm text-zinc-400">
            Kick things off — keep it short and weird.
            <textarea
              className="mt-2 min-h-[140px] w-full resize-y rounded-xl border border-white/10 bg-night-deep/90 px-4 py-3 text-base text-white outline-none ring-violet-500/30 focus:ring-2"
              maxLength={maxChars}
              value={text}
              placeholder="e.g. A cat trying to parallel park…"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className="mt-1 text-right text-xs text-zinc-500">
            {text.length}/{maxChars}
          </p>
          <Button
            className="mt-4"
            disabled={busy || text.trim().length < 2}
            onClick={onSubmitText}
          >
            Lock it in
          </Button>
        </GlassCard>
      )}

      {kind === "draw" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isNarrow && (
            <GlassCard className="mb-4 border-amber-500/20 bg-amber-500/5">
              <p className="text-sm text-amber-100/90">
                Heads up — drawing on a phone is tricky. Tablet or laptop works way better.
              </p>
            </GlassCard>
          )}
          <GlassCard>
            <p className="mb-3 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
              <span className="font-semibold text-white">Prompt: </span>
              {prevEntry?.text ?? "—"}
            </p>
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

      {kind === "describe" && (
        <GlassCard>
          {prevEntry?.imageDataUrl ? (
            <ImagePreview
              src={prevEntry.imageDataUrl}
              alt="Previous drawing"
              className="mb-4"
            />
          ) : prevEntry?.timedOut ? (
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-6 text-center">
              <p className="text-sm text-amber-200/80">
                The last person ran out of time. No drawing came through.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Just make something up that fits!
              </p>
            </div>
          ) : null}
          <label className="block text-sm text-zinc-400">
            What do you see? No peeking at the original!
            <textarea
              className="mt-2 min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-night-deep/90 px-4 py-3 text-base text-white outline-none ring-amber-500/30 focus:ring-2"
              maxLength={maxChars}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className="mt-1 text-right text-xs text-zinc-500">
            {text.length}/{maxChars}
          </p>
          <Button
            className="mt-4"
            disabled={busy || text.trim().length < 2}
            onClick={onSubmitText}
          >
            Send it
          </Button>
        </GlassCard>
      )}

      {pendingNames.length > 0 && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Still going: {pendingNames.join(", ")}
        </p>
      )}
    </div>
  );
}
