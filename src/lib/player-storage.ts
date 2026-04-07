import { COLOR_PRESETS, EMOJI_PRESETS } from "./constants";

export interface LocalPlayer {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

const KEY = "drawly_player_v1";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `p_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function loadLocalPlayer(): LocalPlayer {
  if (typeof window === "undefined") {
    return {
      id: "ssr",
      name: "Player",
      emoji: EMOJI_PRESETS[0],
      color: COLOR_PRESETS[0],
    };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<LocalPlayer>;
      if (p.id && p.name) {
        return {
          id: p.id,
          name: p.name,
          emoji: p.emoji || EMOJI_PRESETS[0],
          color: p.color || COLOR_PRESETS[0],
        };
      }
    }
  } catch {
    /* ignore */
  }
  const fresh: LocalPlayer = {
    id: randomId(),
    name: "",
    emoji: EMOJI_PRESETS[Math.floor(Math.random() * EMOJI_PRESETS.length)],
    color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)],
  };
  saveLocalPlayer(fresh);
  return fresh;
}

export function saveLocalPlayer(p: LocalPlayer) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
