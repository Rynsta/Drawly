"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-page flex min-h-dvh items-center justify-center p-6">
      <GlassCard className="max-w-md text-center">
        <h1 className="text-gradient-brand font-display text-2xl font-bold tracking-tight">
          Whoops
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          {error.message || "Something went sideways. Try again?"}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
