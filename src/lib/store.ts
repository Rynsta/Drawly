import { create } from "zustand";
import type { Assignment, PublicRoomState, RevealNav } from "./game-types";
import type { LocalPlayer } from "./player-storage";
import { getSocket } from "./socket-client";

interface DrawlyStore {
  room: PublicRoomState | null;
  player: LocalPlayer;
  socketConnected: boolean;
  lastError: string | null;
  listenersAttached: boolean;
  assignment: Assignment | null;
  submitted: boolean;

  setPlayer: (p: Partial<LocalPlayer>) => void;
  setRoom: (r: PublicRoomState | null) => void;
  setSocketConnected: (v: boolean) => void;
  setError: (e: string | null) => void;

  attachSocketListeners: () => void;
  createRoom: () => Promise<PublicRoomState>;
  joinRoom: (code: string) => Promise<PublicRoomState>;
  leaveRoom: () => void;
  setReady: (ready: boolean) => Promise<boolean>;
  updateProfile: (patch: Partial<Pick<LocalPlayer, "name" | "emoji" | "color">>) => void;
  updateSettings: (patch: Partial<PublicRoomState["settings"]>) => void;
  startGame: () => Promise<boolean>;
  submit: (content: { text?: string; imageDataUrl?: string }) => Promise<boolean>;
  navigateReveal: (nav: RevealNav) => void;
}

export const useDrawlyStore = create<DrawlyStore>((set, get) => ({
  room: null,
  player: {
    id: "ssr",
    name: "",
    emoji: "🎨",
    color: "#a78bfa",
  },
  socketConnected: false,
  lastError: null,
  listenersAttached: false,
  assignment: null,
  submitted: false,

  setPlayer: (p) =>
    set((s) => ({
      player: { ...s.player, ...p },
    })),

  setRoom: (r) => set({ room: r }),
  setSocketConnected: (v) => set({ socketConnected: v }),
  setError: (e) => set({ lastError: e }),

  attachSocketListeners: () => {
    const markConnected = () =>
      set({ socketConnected: true, lastError: null });

    if (get().listenersAttached) {
      const socket = getSocket();
      if (socket.connected) markConnected();
      return;
    }

    const socket = getSocket();
    socket.on("connect", markConnected);
    socket.on("disconnect", () => set({ socketConnected: false }));
    socket.on("connect_error", (err: Error) => {
      set({
        socketConnected: false,
        lastError: err?.message || "Could not reach game server",
      });
    });

    socket.on("room:state", (state: PublicRoomState) => {
      const prev = get().room;
      const roundChanged =
        prev && prev.phase === "playing" && state.phase === "playing" && prev.currentRound !== state.currentRound;
      const phaseChanged = prev && prev.phase !== state.phase;
      if (roundChanged || phaseChanged) {
        set({ submitted: false });
      }
      set({ room: state });
    });

    socket.on("game:assignment", (a: Assignment) => {
      set({ assignment: a, submitted: false });
    });

    socket.on("reveal:nav", (nav: RevealNav) => {
      set((s) => {
        if (!s.room) return s;
        return { room: { ...s.room, revealNav: nav } };
      });
    });

    if (socket.connected) markConnected();
    set({ listenersAttached: true });
  },

  createRoom: () =>
    new Promise((resolve, reject) => {
      get().attachSocketListeners();
      const { player } = get();
      const socket = getSocket();
      socket.emit(
        "room:create",
        {
          player: {
            id: player.id,
            name: player.name || "Player",
            emoji: player.emoji,
            color: player.color,
          },
        },
        (ack: { ok?: boolean; state?: PublicRoomState; error?: string }) => {
          if (ack?.ok && ack.state) {
            set({ room: ack.state, lastError: null });
            resolve(ack.state);
          } else reject(new Error(ack?.error || "Could not create room"));
        },
      );
    }),

  joinRoom: (code) =>
    new Promise((resolve, reject) => {
      get().attachSocketListeners();
      const { player } = get();
      const socket = getSocket();
      socket.emit(
        "room:join",
        {
          code: code.toUpperCase(),
          player: {
            id: player.id,
            name: player.name || "Player",
            emoji: player.emoji,
            color: player.color,
          },
        },
        (ack: { ok?: boolean; state?: PublicRoomState; error?: string }) => {
          if (ack?.ok && ack.state) {
            set({ room: ack.state, lastError: null });
            resolve(ack.state);
          } else reject(new Error(ack?.error || "Could not join room"));
        },
      );
    }),

  leaveRoom: () => {
    const socket = getSocket();
    socket.emit("room:leave");
    set({ room: null, assignment: null, submitted: false });
  },

  setReady: (ready) =>
    new Promise<boolean>((resolve) => {
      const socket = getSocket();
      socket.emit("room:ready", { ready }, (ack: { ok?: boolean }) => {
        resolve(Boolean(ack?.ok));
      });
    }),

  updateProfile: (patch) => {
    const { player } = get();
    const next = { ...player, ...patch };
    set({ player: next });
    const socket = getSocket();
    socket.emit("room:profile", patch);
  },

  updateSettings: (patch) => {
    const socket = getSocket();
    socket.emit("room:settings", patch);
  },

  startGame: () =>
    new Promise<boolean>((resolve) => {
      const socket = getSocket();
      socket.emit("game:start", (ack: { ok?: boolean }) => {
        resolve(Boolean(ack?.ok));
      });
    }),

  submit: (content) =>
    new Promise<boolean>((resolve) => {
      const socket = getSocket();
      const roundAtSubmit = get().room?.currentRound;
      socket.emit(
        "game:submit",
        content,
        (ack: { ok?: boolean }) => {
          if (ack?.ok) {
            // Only mark submitted if we're still on the same round.
            // When the last player submits, the server broadcasts room:state
            // (advancing the round) before sending the ack — so by the time
            // this callback fires, the round may have already changed.
            if (get().room?.currentRound === roundAtSubmit) {
              set({ submitted: true });
            }
          }
          resolve(Boolean(ack?.ok));
        },
      );
    }),

  navigateReveal: (nav) => {
    const socket = getSocket();
    socket.emit("reveal:navigate", nav);
  },
}));
