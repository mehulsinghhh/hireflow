import { redis } from "../lib/redis.js";

const DEFAULT_TTL_SECONDS = 60;

export async function getCache<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);

  if (!cached) {
    return null;
  }

  return JSON.parse(cached) as T;
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<void> {
  await redis.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  });
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

export async function deleteCacheByPattern(
  pattern: string
): Promise<void> {
  const keysToDelete: string[] = [];

  for await (const key of redis.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    keysToDelete.push(...key);
  }

  if (keysToDelete.length > 0) {
    await redis.del(keysToDelete);
  }
}