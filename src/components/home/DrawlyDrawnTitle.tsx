"use client";

import { cn } from "@/lib/cn";

const STAGGER_S = 0.09;
const BASE_DELAY_S = 0.04;

/**
 * Hero title: each letter “draws” in via CSS (scaleX + opacity), staggered.
 * Implemented with keyframes in globals.css so it always runs on refresh.
 */
export function DrawlyDrawnTitle({ className }: { className?: string }) {
  const letters = "Drawly".split("");

  return (
    <h1
      className={cn(
        "mt-3 flex flex-wrap items-baseline gap-[0.03em] text-5xl font-bold tracking-tight md:text-7xl",
        className,
      )}
    >
      {letters.map((char, i) => (
        <span key={`${char}-${i}`} className="drawly-title-letter">
          <span
            className="drawly-title-letter__inner"
            style={{
              animationDelay: `${BASE_DELAY_S + i * STAGGER_S}s`,
            }}
          >
            {char}
          </span>
        </span>
      ))}
    </h1>
  );
}
