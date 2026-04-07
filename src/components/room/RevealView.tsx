"use client";

import { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    colors: ["#a78bfa", "#22d3ee", "#f472b6"],
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
  if (entry.kind === "prompt") return "Original prompt";
  if (entry.kind === "draw") return "Drawing";
  return "Description";
}

function BookPage({ entry }: { entry: ChainEntry }) {
  return (
    <div className="flex min-h-[min(420px,62vh)] flex-col">
      <div className="border-b border-white/10 pb-3">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          {stepLabel(entry)}
        </p>
        <p className="mt-1 text-sm font-medium text-violet-200">
          {entry.playerName}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center py-4">
        {entry.text != null && entry.text.length > 0 && (
          <p className="text-lg leading-relaxed text-zinc-100 md:text-xl">
            {entry.text}
          </p>
        )}
        {entry.imageDataUrl ? (
          <div
            className={cn(
              "overflow-hidden rounded-xl ring-1 ring-white/10",
              entry.text != null && entry.text.length > 0 ? "mt-4" : "",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.imageDataUrl}
              alt={`Drawing by ${entry.playerName}`}
              className="max-h-[min(340px,50vh)] w-full bg-white object-contain"
            />
          </div>
        ) : null}
        {!entry.text && !entry.imageDataUrl && (
          <p className="text-center text-sm text-zinc-500">Empty step</p>
        )}
      </div>
    </div>
  );
}

function BookFlipbook({
  book,
  roomCode,
  onBack,
}: {
  book: Book;
  roomCode: string;
  onBack: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const entries = book.entries;
  const n = entries.length;
  const safePage = n > 0 ? Math.min(page, n - 1) : 0;
  const entry = n > 0 ? entries[safePage] : null;

  useEffect(() => {
    if (n > 0 && page > n - 1) setPage(n - 1);
  }, [n, page]);

  const go = useCallback(
    (delta: number) => {
      setDirection(delta > 0 ? 1 : -1);
      setPage((p) => Math.max(0, Math.min(n - 1, p + delta)));
    },
    [n],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "ArrowRight") {
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
  }, [go, onBack]);

  const downloadCurrentDrawing = () => {
    if (!entry?.imageDataUrl || entry.kind !== "draw") return;
    const a = document.createElement("a");
    a.href = entry.imageDataUrl;
    a.download = `drawly-${roomCode}-${book.ownerName}-page-${safePage + 1}.png`;
    a.click();
  };

  const flipTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

  const pageVariants = reduceMotion
    ? {
        enter: { opacity: 1, rotateY: 0, x: 0 },
        center: { opacity: 1, rotateY: 0, x: 0 },
        exit: { opacity: 1, rotateY: 0, x: 0 },
      }
    : {
        enter: (dir: number) => ({
          rotateY: dir >= 0 ? 88 : -88,
          opacity: 0,
          x: dir >= 0 ? 28 : -28,
        }),
        center: { rotateY: 0, opacity: 1, x: 0 },
        exit: (dir: number) => ({
          rotateY: dir >= 0 ? -88 : 88,
          opacity: 0,
          x: dir >= 0 ? -28 : 28,
        }),
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
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          ← All books
        </Button>
        <h2 className="text-lg font-semibold text-white">
          {book.ownerName}&rsquo;s book
        </h2>
      </div>

      <div className="[perspective:1400px]">
        <div
          className="relative overflow-visible rounded-2xl border border-white/15 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(24,24,40,0.98) 0%, rgba(15,15,26,0.99) 40%, rgba(20,18,35,0.98) 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-y-4 left-0 w-3 rounded-l-lg bg-gradient-to-r from-violet-950/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-6 left-1 w-px bg-white/10" />

          <div className="relative px-5 py-6 pl-8 md:px-10 md:py-8 md:pl-12">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={safePage}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={flipTransition}
                style={{ transformStyle: "preserve-3d" }}
                className="origin-center"
              >
                {entry ? <BookPage entry={entry} /> : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          className="min-w-[8rem] gap-1"
          disabled={safePage <= 0}
          onClick={() => go(-1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm tabular-nums text-zinc-400">
            Page{" "}
            <span className="font-medium text-zinc-200">{safePage + 1}</span>{" "}
            of <span className="font-medium text-zinc-200">{n}</span>
          </p>
          <div
            className="flex flex-wrap justify-center gap-1.5"
            role="tablist"
            aria-label="Book pages"
          >
            {entries.map((c, i) => (
              <button
                key={`${c.round}-${c.kind}`}
                type="button"
                role="tab"
                aria-selected={i === safePage}
                aria-label={`Go to page ${i + 1}`}
                onClick={() => {
                  setDirection(i > safePage ? 1 : -1);
                  setPage(i);
                }}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === safePage
                    ? "w-6 bg-violet-400"
                    : "w-2 bg-white/20 hover:bg-white/35",
                )}
              />
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="min-w-[8rem] gap-1"
          disabled={safePage >= n - 1}
          onClick={() => go(1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          variant="secondary"
          onClick={downloadCurrentDrawing}
          disabled={!entry || entry.kind !== "draw" || !entry.imageDataUrl}
        >
          Download this drawing
        </Button>
      </div>
    </>
  );
}

export function RevealView() {
  const room = useDrawlyStore((s) => s.room);
  const leaveRoom = useDrawlyStore((s) => s.leaveRoom);
  const router = useRouter();
  const [burstDone, setBurstDone] = useState(false);
  const [selectedBookIdx, setSelectedBookIdx] = useState<number | null>(null);

  const books = room?.books ?? [];

  useEffect(() => {
    if (!burstDone && books.length > 0) {
      burst();
      setBurstDone(true);
    }
  }, [burstDone, books.length]);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Drawly game",
          text: "Check out our Drawly books — flip through the stories!",
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
    selectedBookIdx !== null && books[selectedBookIdx]
      ? books[selectedBookIdx]
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 text-center">
        <motion.h1
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-gradient-brand text-4xl font-bold tracking-tight md:text-5xl"
        >
          The Reveal
        </motion.h1>
        <p className="mt-2 text-sm text-zinc-400">
          {selectedBook
            ? "Flip through the pages to walk the full story."
            : "Pick a book to see how the chain evolved."}
        </p>
      </header>

      {selectedBook ? (
        <BookFlipbook
          book={selectedBook}
          roomCode={room.code}
          onBack={() => setSelectedBookIdx(null)}
        />
      ) : books.length === 0 ? (
        <GlassCard className="py-12 text-center text-zinc-400">
          No books to show.
        </GlassCard>
      ) : (
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
                onClick={() => setSelectedBookIdx(idx)}
              >
                <p className="text-lg font-semibold text-white group-hover:text-violet-200">
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
