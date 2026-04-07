import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { RoomManager } from "./engine";
import { registerDrawlySocketHandlers } from "./socket-handlers";

/** Railway/Render/Fly set `PORT`; local dev uses SOCKET_PORT or 4000. */
const LISTEN_PORT = Number(
  process.env.PORT || process.env.SOCKET_PORT || 4000,
);

/** Browser origins allowed for REST + Socket.io. Local dev allows both hostname styles. */
function socketCorsOrigins(): string[] {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  if (!/localhost|127\.0\.0\.1/.test(appUrl)) {
    return [appUrl];
  }
  return [
    ...new Set([
      appUrl,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]),
  ];
}

const ALLOWED_ORIGINS = socketCorsOrigins();

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true, service: "drawly-socket" }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 15e6,
});

const rooms = new RoomManager();
registerDrawlySocketHandlers(io, rooms);

httpServer.listen(LISTEN_PORT, () => {
  console.log(
    `Drawly socket server on :${LISTEN_PORT} (CORS: ${ALLOWED_ORIGINS.join(", ")})`,
  );
});
