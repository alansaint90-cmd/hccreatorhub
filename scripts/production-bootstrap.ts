import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";
import { users, auditLog } from "../src/lib/db/schema";
import { registerSchema } from "../src/lib/validators";
import { hashPassword } from "../src/lib/security";

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Configure DATABASE_URL com o PostgreSQL 16 no EasyPanel.");
  const hasAdmin = Boolean(
    process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD,
  );
  const admin = hasAdmin
    ? registerSchema.parse({
        name: "Administrador",
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
    : null;
  const client = postgres(process.env.DATABASE_URL, {
    max: 1,
    connect_timeout: 15,
  });
  try {
    const version = await client`show server_version`;
    if (!/^16\./.test(version[0].server_version))
      throw new Error("Este sistema requer PostgreSQL 16.");
    await client`select pg_advisory_lock(1737067180)`;
    const db = drizzle(client);
    try {
      await migrate(db, {
        migrationsFolder: process.env.MIGRATIONS_DIR || "./migrations",
      });
      if (admin)
        await db.transaction(async (tx) => {
          const [existing] = await tx
            .select()
            .from(users)
            .where(eq(users.email, admin.email));
          if (existing) {
            if (
              existing.isDeleted ||
              !["admin", "super_admin"].includes(existing.role)
            )
              throw new Error(
                "O e-mail administrativo já pertence a outra conta. Configure outro ADMIN_EMAIL.",
              );
            return; // Never reset passwords, roles or existing data on redeploy.
          }
          const id = randomUUID();
          await tx
            .insert(users)
            .values({
              id,
              name: admin.name,
              email: admin.email,
              password: hashPassword(admin.password),
              role: "super_admin",
              modifiedBy: id,
            });
          await tx
            .insert(auditLog)
            .values({
              action: "administrador inicial criado",
              entityId: id,
              modifiedBy: id,
            });
        });
      console.log("PostgreSQL 16: migrações prontas. Inicialização concluída.");
      if (!admin)
        console.log(
          "Configure ADMIN_EMAIL e ADMIN_PASSWORD para criar a primeira conta da equipe.",
        );
    } finally {
      await client`select pg_advisory_unlock(1737067180)`;
    }
  } finally {
    await client.end();
  }
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error && !("issues" in error)
      ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[DATABASE_URL]")
      : "Confira ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 12 caracteres).",
  );
  process.exitCode = 1;
});
