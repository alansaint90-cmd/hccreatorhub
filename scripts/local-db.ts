import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";
import { users, auditLog } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/security";
import { randomUUID } from "node:crypto";
async function main() {
  mkdirSync(".local", { recursive: true });
  if (!existsSync(".env")) {
    const dbPassword = randomBytes(24).toString("hex");
    const adminPassword = randomBytes(18).toString("base64url");
    writeFileSync(
      ".env",
      `DATABASE_URL=postgres://creator:${dbPassword}@127.0.0.1:55432/creator_hub\nPOSTGRES_PASSWORD=${dbPassword}\nADMIN_EMAIL=admin@creatorhub.local\nADMIN_PASSWORD=${adminPassword}\n`,
    );
    writeFileSync(
      ".local/access.txt",
      `Creator Hub — acesso local\nEndereço: http://127.0.0.1:3000\nE-mail: admin@creatorhub.local\nSenha: ${adminPassword}\n\nCredenciais exclusivas desta instalação local.\n`,
    );
  }
  config({ quiet: true });
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "127.0.0.1" || url.port !== "55432")
    throw new Error("Este script só gerencia o banco portátil local na porta 55432.");
  const pg = new EmbeddedPostgres({
    databaseDir: resolve(".local/postgres"),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    port: 55432,
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: () => {},
  });
  if (!existsSync(".local/postgres/PG_VERSION")) await pg.initialise();
  await pg.start();
  const admin = postgres({
    ...{
      host: "127.0.0.1",
      port: 55432,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    },
    database: "postgres",
  });
  const existing = await admin`select datname from pg_database where datname = 'creator_hub'`;
  if (!existing.length) await admin.unsafe("CREATE DATABASE creator_hub");
  await admin.end();
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: resolve("src/lib/db/migrations") });
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, process.env.ADMIN_EMAIL!));
  if (!user) {
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({
          id,
          name: "Allan",
          email: process.env.ADMIN_EMAIL!,
          password: hashPassword(process.env.ADMIN_PASSWORD!),
          role: "super_admin",
          modifiedBy: id,
        });
      await tx.insert(auditLog).values({ action: "administrador local criado", entityId: id, modifiedBy: id });
    });
  }
  await sql.end();
  console.log("PostgreSQL 16 pronto na porta 55432. Credenciais em .local/access.txt.");
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 60000);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Não foi possível iniciar o banco local.");
  process.exit(1);
});
