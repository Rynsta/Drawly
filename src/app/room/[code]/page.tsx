"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LobbyView } from "@/components/room/LobbyView";
import { GameView } from "@/components/room/GameView";
import { RevealView } from "@/components/room/RevealView";
import { useDrawlyStore } from "@/lib/store";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

function RoomSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function RoomPage() {
  const params = useParams();
  const code = String(params.code ?? "").toUpperCase();
  const router = useRouter();
  const joinRoom = useDrawlyStore((s) => s.joinRoom);
  const room = useDrawlyStore((s) => s.room);
  const setError = useDrawlyStore((s) => s.setError);
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");

  useEffect(() => {
    if (!code) {
      setStatus("err");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        await joinRoom(code);
        if (!cancelled) setStatus("ok");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Join failed");
        if (!cancelled) setStatus("err");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, joinRoom, setError]);

  if (status === "loading" || (status === "ok" && (!room || room.code !== code))) {
    return (
      <div className="bg-page min-h-dvh">
        <RoomSkeleton />
      </div>
    );
  }

  if (status === "err" || !room) {
    return (
      <div className="bg-page flex min-h-dvh items-center justify-center p-6">
        <GlassCard className="max-w-md text-center">
          <p className="text-zinc-300">
            That room does not exist, or the game server is offline.
          </p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            Back home
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="bg-page min-h-dvh">
      {room.phase === "lobby" && <LobbyView />}
      {room.phase === "playing" && <GameView />}
      {room.phase === "reveal" && <RevealView />}
    </div>
  );
}
