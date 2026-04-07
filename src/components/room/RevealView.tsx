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
    colors: ["#60a5fa", "#f472b6", "#fb923c"],
  });
  setTimeout(() => {
    void confetti({
      ...c,
      particleCount: 50,
      angle: 60,
      spread: 55,
      colors: ["#fb923c", "#f472b6"],
    });
  }, 180);
}

const ENTRY_KIND_META = {
  prompt: {
    label: "The starting prompt",
    badge: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
    border: "border-blue-500/20",
    icon: "💬",
  },
  draw: {
    label: "The drawing",
    badge: "bg-pink-500/20 text-pink-300 ring-pink-500/30",
    border: "border-pink-500/20",
    icon: "🎨",
  },
  describe: {
    label: "What they saw",
    badge: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
    border: "border-orange-500/20",
    icon: "🔍",
  },
};

function stepLabel(entry: ChainEntry) {
  if (entry.timedOut) return "Ran out of time!";
  return ENTRY_KIND_META[entry.kind].label;
}

function EntryCard({ entry, index }: { entry: ChainEntry; index: number }) {
  const reduceMotion = useReducedMotion();
  const meta = ENTRY_KIND_META[entry.kind];

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Connector line */}
      {index > 0 && (
        <div className="absolute -top-4 left-6 h-4 w-px bg-gradient-to-b from-transparent via-white/15 to-white/15" />
      )}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border",
          entry.timedOut
            ? "border-orange-500/25 bg-orange-950/20"
            : `${meta.border} bg-[#080c16]/70`,
        )}
        style={{
          boxShadow: entry.timedOut
            ? "0 4px 24px -8px rgba(249,115,22,0.15)"
            : "0 4px 24px -8px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-5 py-3">
          <span className="text-lg">{entry.timedOut ? "⏰" : meta.icon}</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-bold ring-1",
              entry.timedOut
                ? "bg-orange-500/20 text-orange-400 ring-orange-500/30"
                : meta.badge,
            )}
          >
            {stepLabel(entry)}
          </span>
          <span className="ml-auto text-sm font-medium text-zinc-400">
            {entry.playerName}
          </span>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {entry.timedOut && !entry.imageDataUrl && (
            <p className="text-center text-sm italic text-orange-200/50">
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
            ← All books
          </Button>
        )}
        <h2 className="font-display text-lg font-semibold text-white">
          {book.ownerName}&rsquo;s book
        </h2>
        {isHost && (
          <span className="ml-auto text-xs text-zinc-500">
            Space / → to reveal
          </span>
        )}
      </div>

      <div className="space-y-4">
        {entries.slice(0, shown).map((entry, i) => (
          <div key={`${entry.round}-${entry.kind}`}>
            <EntryCard entry={entry} index={i} />
            {entry.kind === "draw" && entry.imageDataUrl && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                  onClick={() => downloadDrawing(entry, i)}
                >
                  ↓ Download drawing
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div ref={bottomRef} className="mt-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: n }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i < shown ? "w-4 bg-blue-400" : "w-1.5 bg-white/20",
              )}
            />
          ))}
        </div>
        <p className="text-sm tabular-nums text-zinc-400">
          <span className="font-semibold text-zinc-200">{shown}</span> /{" "}
          <span className="font-semibold text-zinc-200">{n}</span> revealed
        </p>
        {isHost && !allRevealed && (
          <Button onClick={onRevealNext}>Reveal next →</Button>
        )}
        {allRevealed && (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <span>✓</span> All entries revealed!
          </p>
        )}
      </div>
    </>
  );
}

const BOOK_COLORS = [
  "from-blue-600/30 to-blue-900/10 border-blue-500/25",
  "from-pink-600/30 to-pink-900/10 border-pink-500/25",
  "from-orange-600/30 to-orange-900/10 border-orange-500/25",
  "from-cyan-600/30 to-cyan-900/10 border-cyan-500/25",
  "from-emerald-600/30 to-emerald-900/10 border-emerald-500/25",
  "from-rose-600/30 to-rose-900/10 border-rose-500/25",
  "from-sky-600/30 to-sky-900/10 border-sky-500/25",
  "from-teal-600/30 to-teal-900/10 border-teal-500/25",
];

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
      <header className="mb-10 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4 }}
        >
          <p className="text-5xl">🎊</p>
          <h1 className="text-gradient-brand mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            The Big Reveal
          </h1>
        </motion.div>
        <p className="mt-3 text-sm text-zinc-400">
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
          {books.map((book, idx) => {
            const colorClass = BOOK_COLORS[idx % BOOK_COLORS.length];
            return (
              <motion.li
                key={book.ownerId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
              >
                <button
                  type="button"
                  className={`group w-full overflow-hidden rounded-2xl border bg-gradient-to-br px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${colorClass}`}
                  onClick={() => selectBook(idx)}
                >
                  <p className="font-display text-lg font-bold text-white">
                    {book.ownerName}&rsquo;s book
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {book.entries.length} page
                    {book.entries.length !== 1 ? "s" : ""} · tap to reveal
                  </p>
                </button>
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <GlassCard className="py-12 text-center">
          <p className="text-3xl">⏳</p>
          <p className="mt-3 text-lg font-semibold text-zinc-200">
            Hang tight, the host is picking…
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {books.length} book{books.length !== 1 ? "s" : ""} to explore
          </p>
        </GlassCard>
      )}

      <div className="mt-12 flex flex-wrap justify-center gap-3">
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
