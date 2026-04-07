import { Redis } from "@upstash/redis";
import type { SerializedRoom } from "./engine";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

const ROOM_PREFIX = "drawly:room:";
const ROOM_TTL_SEC = 60 * 60 * 24;

export async function persistRoom(code: string, data: SerializedRoom): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(`${ROOM_PREFIX}${code}`, JSON.stringify(data), { ex: ROOM_TTL_SEC });
}

export async function loadRoom(code: string): Promise<SerializedRoom | null> {
  const r = getRedis();
  if (!r) return null;
  const raw = await r.get<string>(`${ROOM_PREFIX}${code}`);
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as SerializedRoom;
  } catch {
    return null;
  }
}

export async function deleteRoomPersisted(code: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(`${ROOM_PREFIX}${code}`);
}
