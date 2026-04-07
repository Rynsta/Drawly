"use client";

import { useEffect, useRef, useState } from "react";
import { sfxTimerWarn } from "@/lib/sfx";
import { hapticWarning } from "@/lib/haptics";

export function TurnTimer({ endsAt }: { endsAt: number | null }) {
  const [left, setLeft] = useState<number | null>(null);
  const warned = useRef<number | null>(null);

  useEffect(() => {
    warned.current = null;
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(s);
      const marks = [10, 5, 3];
      if (marks.includes(s) && warned.current !== s) {
        warned.current = s;
        sfxTimerWarn();
        hapticWarning();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (left === null) return null;

  const urgent = left <= 10;
  const critical = left <= 5;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1 transition-all duration-300 ${
        critical
          ? "timer-urgent bg-red-500/20 text-red-200 ring-red-400/50"
          : urgent
            ? "bg-amber-500/20 text-amber-200 ring-amber-400/40"
            : "bg-white/[0.06] text-zinc-200 ring-white/10"
      }`}
    >
      {urgent && (
        <span
          className={`h-2 w-2 rounded-full ${critical ? "animate-ping bg-red-400" : "bg-amber-400 pulse-ready"}`}
        />
      )}
      <span className={`tabular-nums ${urgent ? "text-base" : ""}`}>
        {left}
      </span>
      <span className="text-xs font-normal opacity-60">s</span>
    </div>
  );
}
