"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function ImagePreview({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((s) => Math.min(4, Math.max(0.5, s + delta)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setPos({ x: drag.current.px + dx, y: drag.current.py + dy });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={wrap}
      className={cn(
        "relative overflow-hidden rounded-2xl ring-1 ring-white/10 bg-night-deep",
        className,
      )}
      onWheel={onWheel}
    >
      <div
        className="flex h-full min-h-[220px] cursor-grab items-center justify-center active:cursor-grabbing touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[min(55vh,480px)] max-w-full select-none object-contain"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: drag.current ? "none" : "transform 0.2s ease-out",
          }}
          draggable={false}
        />
      </div>
      <p className="absolute bottom-2 left-3 text-xs text-zinc-500">
        Scroll to zoom · drag to pan
      </p>
    </div>
  );
}
