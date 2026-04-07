import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/[0.08] ring-1 ring-white/[0.06]",
        className,
      )}
    />
  );
}
