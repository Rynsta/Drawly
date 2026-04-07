"use client";

import { useEffect } from "react";
import { loadLocalPlayer, saveLocalPlayer } from "@/lib/player-storage";
import { useDrawlyStore } from "@/lib/store";

export function DrawlyProviders({ children }: { children: React.ReactNode }) {
  const player = useDrawlyStore((s) => s.player);
  const setPlayer = useDrawlyStore((s) => s.setPlayer);
  const attachSocketListeners = useDrawlyStore((s) => s.attachSocketListeners);

  useEffect(() => {
    const p = loadLocalPlayer();
    setPlayer(p);
    attachSocketListeners();
  }, [setPlayer, attachSocketListeners]);

  useEffect(() => {
    if (player.id && player.id !== "ssr") {
      saveLocalPlayer(player);
    }
  }, [player]);

  return <>{children}</>;
}
