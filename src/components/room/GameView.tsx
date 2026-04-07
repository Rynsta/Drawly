"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { DrawingCanvas } from "@/components/draw/DrawingCanvas";
import { ImagePreview } from "@/components/room/ImagePreview";
import { TurnTimer } from "@/components/room/TurnTimer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDrawlyStore } from "@/lib/store";
import { segmentKind } from "@/lib/game-types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { sfxError, sfxSuccess } from "@/lib/sfx";
import { hapticSuccess } from "@/lib/haptics";

export function GameView() {
  const room = useDrawlyStore((s) => s.room);
  const player = useDrawlyStore((s) => s.player);
  const submitPrompt = useDrawlyStore((s) => s.submitPrompt);
  const submitDraw = useDrawlyStore((s) => s.submitDraw);
  const submitDescribe = useDrawlyStore((s) => s.submitDescribe);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const isNarrow = useMediaQuery("(max-width: 767px)");

  const kind = room ? segmentKind(room.currentSegment) : "prompt";
  const active = room?.activePlayerId === player.id;
  const last = room?.chain[room.chain.length - 1];

  const promptForDraw = useMemo(() => {
    if (!room || kind !== "draw") return "";
    if (last?.kind === "prompt" || last?.kind === "describe") return last.text ?? "";
    return "";
  }, [room, kind, last]);

  const imageForDescribe = last?.kind === "draw" ? last.imageDataUrl : undefined;

  if (!room) return null;

  const maxChars = room.settings.describeMaxChars;

  const onSubmitText = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok =
      kind === "prompt"
        ? await submitPrompt(text.trim())
        : await submitDescribe(text.trim());
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
    const ok = await submitDraw(dataUrl);
    setBusy(false);
    if (ok) {
      sfxSuccess();
      hapticSuccess();
    } else sfxError();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300/80">
            Round {room.currentSegment + 1} / {room.settings.rounds}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {kind === "prompt" && "Write the starting prompt"}
            {kind === "draw" && "Draw what you read"}
            {kind === "describe" && "Describe the drawing"}
          </h2>
        </div>
        <TurnTimer endsAt={room.turnEndsAt} />
      </div>

      {!active && (
        <GlassCard className="text-center">
          <p className="text-lg text-zinc-200">You’re spectating this turn</p>
          <p className="mt-2 text-sm text-zinc-500">
            Wait for your turn — the chain is building.
          </p>
        </GlassCard>
      )}

      {active && kind === "prompt" && (
        <GlassCard>
          <label className="block text-sm text-zinc-400">
            Start the story — keep it short and weird.
            <textarea
              className="mt-2 min-h-[140px] w-full resize-y rounded-xl border border-white/10 bg-night-deep/90 px-4 py-3 text-base text-white outline-none ring-violet-500/30 focus:ring-2"
              maxLength={maxChars}
              value={text}
              placeholder="e.g. A nervous toaster at a talent show…"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className="mt-1 text-right text-xs text-zinc-500">
            {text.length}/{maxChars}
          </p>
          <Button className="mt-4" disabled={busy || text.trim().length < 2} onClick={onSubmitText}>
            Lock in prompt
          </Button>
        </GlassCard>
      )}

      {active && kind === "draw" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {isNarrow && (
            <GlassCard className="mb-4 border-amber-500/20 bg-amber-500/5">
              <p className="text-sm text-amber-100/90">
                Drawing works best on a tablet or desktop. You can still try with
                touch, or ask a friend to take this turn.
              </p>
            </GlassCard>
          )}
          <GlassCard>
            <p className="mb-3 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
              <span className="font-semibold text-white">Prompt: </span>
              {promptForDraw || "—"}
            </p>
            <ErrorBoundary>
              <DrawingCanvas disabled={busy} onExport={onSubmitDraw} />
            </ErrorBoundary>
          </GlassCard>
        </motion.div>
      )}

      {active && kind === "describe" && imageForDescribe && (
        <GlassCard>
          <ImagePreview src={imageForDescribe} alt="Previous drawing" className="mb-4" />
          <label className="block text-sm text-zinc-400">
            Describe what you see — no cheating with the original prompt.
            <textarea
              className="mt-2 min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-night-deep/90 px-4 py-3 text-base text-white outline-none ring-cyan-500/30 focus:ring-2"
              maxLength={maxChars}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className="mt-1 text-right text-xs text-zinc-500">
            {text.length}/{maxChars}
          </p>
          <Button className="mt-4" disabled={busy || text.trim().length < 2} onClick={onSubmitText}>
            Submit description
          </Button>
        </GlassCard>
      )}
    </div>
  );
}
