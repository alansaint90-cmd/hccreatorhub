import { createClient } from "redis";
export function validRedisUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      ["redis:", "rediss:"].includes(url.protocol) && Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}
function redisClient(url: string) {
  return createClient({
    url,
    socket: { connectTimeout: 3000, reconnectStrategy: false },
    disableOfflineQueue: true,
  });
}
export async function withRedis<T>(
  run: (client: ReturnType<typeof redisClient>) => Promise<T>,
): Promise<T> {
  const url = process.env.REDIS_URL;
  if (!url || !validRedisUrl(url))
    throw new Error(
      "Configure REDIS_URL com redis:// ou rediss:// do serviço Redis.",
    );
  const client = redisClient(url);
  client.on("error", () => {}); // Never log credentials from connection errors.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await client.connect();
    return await Promise.race([
      run(client),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Redis indisponível.")),
          4000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (client.isOpen) client.destroy();
  }
}
export async function sharedAttempt(
  key: string,
  limit: number,
  seconds: number,
) {
  if (!process.env.REDIS_URL) return false;
  try {
    const count = await withRedis((client) =>
      client.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
        { keys: [`hc:attempt:${key}`], arguments: [String(seconds)] },
      ),
    );
    if (Number(count) > limit)
      throw new Error("Muitas tentativas. Aguarde alguns minutos.");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Muitas tentativas"))
      throw error;
    // Registration remains available; the admin diagnosis explicitly reports this degraded mode.
    return false;
  }
}
