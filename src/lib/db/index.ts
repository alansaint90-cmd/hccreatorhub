import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
const globalDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("Configure o PostgreSQL para acessar a plataforma.");
  const sql = (globalDb.sql ??= postgres(process.env.DATABASE_URL, { max: 10, connect_timeout: 5 }));
  return drizzle(sql, { schema });
}
export type Database = ReturnType<typeof getDb>;
