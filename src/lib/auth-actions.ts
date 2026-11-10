"use server";
import { randomBytes, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { users, sessions, auditLog } from "./db/schema";
import { loginSchema, registerSchema } from "./validators";
import { digest, hashPassword, verifyPassword } from "./security";
import { requireSession } from "./auth";
import { errorMessage } from "./errors";
const attempts = new Map<string, { count: number; until: number }>();
export async function authenticate(input: unknown, register = false) {
  try {
    const h = await headers();
    const key = digest((h.get("x-forwarded-for") ?? "local").split(",")[0]);
    const previous = attempts.get(key);
    const attempt = previous && previous.until > Date.now() ? previous : { count: 0, until: Date.now() + 900000 };
    if (attempt.count >= 15) throw new Error("Muitas tentativas. Aguarde 15 minutos.");
    attempt.count++;
    attempts.set(key, attempt);
    if (attempts.size > 10000) for (const [k, v] of attempts) if (v.until < Date.now()) attempts.delete(k);
    const data = (register ? registerSchema : loginSchema).parse(input);
    const db = getDb();
    const token = randomBytes(32).toString("base64url");
    await db.transaction(async (tx) => {
      let [user] = await tx
        .select()
        .from(users)
        .where(and(eq(users.email, data.email), eq(users.isDeleted, false)));
      if (register) {
        if (user) throw new Error("Não foi possível cadastrar. Confira os dados ou entre na sua conta.");
        const full = registerSchema.parse(input);
        const id = randomUUID();
        [user] = await tx
          .insert(users)
          .values({ id, name: full.name, email: full.email, password: hashPassword(full.password), modifiedBy: id })
          .returning();
        await tx.insert(auditLog).values({ action: "creator cadastrado", entityId: id, modifiedBy: id });
      } else if (!user || !verifyPassword(data.password, user.password)) throw new Error("E-mail ou senha incorretos.");
      await tx
        .insert(sessions)
        .values({
          userId: user.id,
          token: digest(token),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          modifiedBy: user.id,
        });
      await tx.insert(auditLog).values({ action: "login", entityId: user.id, modifiedBy: user.id });
    });
    (await cookies()).set("creator_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 86400,
    });
    attempts.delete(key);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function logout() {
  try {
    const s = await requireSession();
    await getDb().transaction(async (tx) => {
      await tx
        .update(sessions)
        .set({ isDeleted: true, deletedAt: sql`now()`, updatedAt: sql`now()`, modifiedBy: s.user.id })
        .where(eq(sessions.id, s.sessionId));
      await tx.insert(auditLog).values({ action: "logout", entityId: s.sessionId, modifiedBy: s.user.id });
    });
    (await cookies()).delete("creator_session");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
