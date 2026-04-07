"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { motion, useReducedMotion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useDrawlyStore } from "@/lib/store";
import type { Book, ChainEntry } from "@/lib/game-types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

function burst() {
  const c = { origin: { y: 0.75, x: 0.5 } };
  void confetti({
    ...c,
    particleCount: 90,
    spread: 70,
    colors: ["#a78bfa", "#fbbf24", "#f472b6"],
  });
  setTimeout(() => {
    void confetti({
      ...c,
      particleCount: 50,
      angle: 60,
      spread: 55,
      colors: ["#fbbf24", "#f472b6"],
    });
  }, 180);
}

function stepLabel(entry: ChainEntry) {
  if (entry.timedOut) return "Ran out of time!";
  if (entry.kind === "prompt") return "The starting prompt";
  if (entry.kind === "draw") return "The drawing";
  return "What they saw";
}

function EntryCard({ entry, index }: { entry: ChainEntry; index: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Connector line from previous entry */}
      {index > 0 && (
        <div className="absolute -top-4 left-1/2 h-4 w-px bg-white/10" />
      )}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border shadow-lg",
          entry.timedOut
            ? "border-amber-500/20 bg-amber-950/30"
            : "border-white/10 bg-night-deep/80",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
          <span
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold",
              entry.kind === "prompt" && "bg-violet-500/20 text-violet-300",
              entry.kind === "draw" && "bg-pink-500/20 text-pink-300",
              entry.kind === "describe" && "bg-amber-500/20 text-amber-300",
              entry.timedOut && "bg-amber-500/20 text-amber-400/70",
            )}
          >
            {stepLabel(entry)}
          </span>
          <span className="text-sm font-medium text-zinc-300">
            {entry.playerName}
          </span>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {entry.timedOut && !entry.imageDataUrl && (
            <p className="text-center text-sm italic text-amber-200/60">
              {entry.text ?? "(nothing submitted)"}
            </p>
          )}

          {!entry.timedOut && entry.text != null && entry.text.length > 0 && (
            <p className="text-lg leading-relaxed text-zinc-100 md:text-xl">
              {entry.text}
            </p>
          )}

          {entry.imageDataUrl && (
            <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.imageDataUrl}
                alt={`Drawing by ${entry.playerName}`}
                className="w-full bg-white object-contain"
              />
            </div>
          )}

          {!entry.timedOut && !entry.text && !entry.imageDataUrl && (
            <p className="text-center text-sm text-zinc-500">Empty step</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BookReveal({
  book,
  roomCode,
  revealedCount,
  isHost,
  onRevealNext,
  onBack,
}: {
  book: Book;
  roomCode: string;
  revealedCount: number;
  isHost: boolean;
  onRevealNext: () => void;
  onBack: () => void;
}) {
  const entries = book.entries;
  const n = entries.length;
  const shown = Math.min(revealedCount, n);
  const allRevealed = shown >= n;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shown > 1) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [shown]);

  const go = useCallback(
    (delta: number) => {
      if (!isHost) return;
      if (delta > 0 && !allRevealed) onRevealNext();
    },
    [isHost, allRevealed, onRevealNext],
  );

  useEffect(() => {
    if (!isHost) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onBack, isHost]);

  const downloadDrawing = (entry: ChainEntry, idx: number) => {
    if (!entry.imageDataUrl || entry.kind !== "draw") return;
    const a = document.createElement("a");
    a.href = entry.imageDataUrl;
    a.download = `drawly-${roomCode}-${book.ownerName}-page-${idx + 1}.png`;
    a.click();
  };

  if (n === 0) {
    return (
      <GlassCard className="py-12 text-center text-zinc-400">
        This book is empty.
      </GlassCard>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        {isHost && (
          <Button variant="ghost" onClick={onBack}>
            &larr; All books
          </Button>
        )}
        <h2 className="font-display text-lg font-semibold text-white">
          {book.ownerName}&rsquo;s book
        </h2>
      </div>

      <div className="space-y-4">
        {entries.slice(0, shown).map((entry, i) => (
          <div key={`${entry.round}-${entry.kind}`}>
            <EntryCard entry={entry} index={i} />
            {entry.kind === "draw" && entry.imageDataUrl && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                  onClick={() => downloadDrawing(entry, i)}
                >
                  Download drawing
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div ref={bottomRef} className="mt-6 flex flex-col items-center gap-3">
        <p className="text-sm tabular-nums text-zinc-400">
          Showing{" "}
          <span className="font-medium text-zinc-200">{shown}</span> of{" "}
          <span className="font-medium text-zinc-200">{n}</span>
        </p>
        {isHost && !allRevealed && (
          <Button onClick={onRevealNext}>
            Reveal next
          </Button>
        )}
        {allRevealed && (
          <p className="text-sm text-emerald-400/80">All entries revealed!</p>
        )}
      </div>
    </>
  );
}

export function RevealView() {
  const room = useDrawlyStore((s) => s.room);
  const player = useDrawlyStore((s) => s.player);
  const leaveRoom = useDrawlyStore((s) => s.leaveRoom);
  const navigateReveal = useDrawlyStore((s) => s.navigateReveal);
  const router = useRouter();
  const [burstDone, setBurstDone] = useState(false);

  const books = room?.books ?? [];
  const isHost = room?.hostId === player.id;
  const revealNav = room?.revealNav ?? { bookIdx: null, page: 0 };

  useEffect(() => {
    if (!burstDone && books.length > 0) {
      burst();
      setBurstDone(true);
    }
  }, [burstDone, books.length]);

  const selectBook = (idx: number | null) => {
    if (!isHost) return;
    navigateReveal({ bookIdx: idx, page: idx !== null ? 1 : 0 });
  };

  const revealNext = () => {
    if (!isHost || revealNav.bookIdx === null) return;
    navigateReveal({ bookIdx: revealNav.bookIdx, page: revealNav.page + 1 });
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Drawly",
          text: "We just played Drawly and the results are unhinged",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* ignore */
    }
  };

  if (!room) return null;

  const selectedBook =
    revealNav.bookIdx !== null && books[revealNav.bookIdx]
      ? books[revealNav.bookIdx]
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 text-center">
        <motion.h1
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-gradient-brand font-display text-4xl font-bold tracking-tight md:text-5xl"
        >
          The Big Reveal
        </motion.h1>
        <p className="mt-2 text-sm text-zinc-400">
          {selectedBook
            ? isHost
              ? "You're the presenter! Tap to reveal each step."
              : "Sit back, the host is driving."
            : isHost
              ? "Pick a book to show everyone!"
              : "Hang tight, the host is picking…"}
        </p>
      </header>

      {selectedBook ? (
        <BookReveal
          book={selectedBook}
          roomCode={room.code}
          revealedCount={revealNav.page}
          isHost={isHost}
          onRevealNext={revealNext}
          onBack={() => selectBook(null)}
        />
      ) : books.length === 0 ? (
        <GlassCard className="py-12 text-center text-zinc-400">
          No books to show.
        </GlassCard>
      ) : isHost ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {books.map((book, idx) => (
            <motion.li
              key={book.ownerId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
            >
              <button
                type="button"
                className="group w-full rounded-2xl border border-white/10 bg-night-deep/60 px-5 py-5 text-left transition-all hover:border-violet-400/40 hover:bg-violet-500/5 hover:shadow-lg hover:shadow-violet-900/20"
                onClick={() => selectBook(idx)}
              >
                <p className="font-display text-lg font-semibold text-white group-hover:text-violet-200">
                  {book.ownerName}&rsquo;s book
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {book.entries.length} page
                  {book.entries.length !== 1 ? "s" : ""}
                </p>
              </button>
            </motion.li>
          ))}
        </ul>
      ) : (
        <GlassCard className="py-12 text-center">
          <p className="text-lg text-zinc-300">
            Hang tight, the host is picking…
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {books.length} book{books.length !== 1 ? "s" : ""} to explore
          </p>
        </GlassCard>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={share}>
          Share room link
        </Button>
        <Button
          onClick={() => {
            leaveRoom();
            router.push("/");
          }}
        >
          Back home
        </Button>
      </div>
    </div>
  );
}
