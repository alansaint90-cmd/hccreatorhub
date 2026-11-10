import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "./db";
import { sessions, users } from "./db/schema";
import { digest } from "./security";
export async function getSession() {
  const token = (await cookies()).get("creator_session")?.value;
  if (!token) return null;
  const [row] = await getDb()
    .select({ user: users, sessionId: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, digest(token)),
        eq(sessions.isDeleted, false),
        eq(users.isDeleted, false),
        gt(sessions.expiresAt, new Date().toISOString()),
      ),
    );
  return row ?? null;
}
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Entre para continuar.");
  return session;
}
