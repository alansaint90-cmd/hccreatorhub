"use server";
import { sql, and, eq, desc, getTableColumns, getTableName } from "drizzle-orm";
import { requireSession } from "./auth";
import { getDb } from "./db";
import { auditLog } from "./db/schema";
import * as schema from "./db/schema";
import { getTableConfig } from "drizzle-orm/pg-core";
import { isAdministrator } from "./offer-validation";
import { withRedis, validRedisUrl } from "./redis";

export async function auditSystem() {
  const { user } = await requireSession();
  if (!isAdministrator(user.role))
    throw new Error("Acesso exclusivo da administração.");
  const checkedAt = new Date().toISOString();
  const db = getDb();
  const definitions = [
    schema.users,
    schema.sessions,
    schema.companies,
    schema.opportunities,
    schema.applications,
    schema.proposals,
    schema.partnerships,
    schema.deliveries,
    schema.finance,
    schema.links,
    schema.clicks,
    schema.notices,
    schema.auditLog,
    schema.offerInvites,
    schema.companyOffers,
    schema.companyRegistrationInvites,
  ];
  const expected = definitions.map(getTableName);
  let postgres: { ok: boolean; message: string } = {
    ok: false,
    message: "PostgreSQL indisponível.",
  };
  let tables: {
    name: string;
    ok: boolean;
    count: number | null;
    missing: string[];
  }[] = [];
  let registration: {
    creators: number;
    incompleteProfiles: number;
    missingAudit: number;
  } | null = null;
  let foreignKeys: string[] = [];
  let recent: {
    id: string;
    action: string;
    createdAt: string;
    entityId: string;
  }[] = [];
  try {
    const version = await db.execute(sql`show server_version`);
    const versionText = String(version[0].server_version);
    postgres = {
      ok: /^16\./.test(versionText),
      message: `PostgreSQL ${versionText}`,
    };
    const columns = await db.execute(
      sql`select table_name,column_name from information_schema.columns where table_schema='public'`,
    );
    const constraints = await db.execute(
      sql`select table_name,constraint_type from information_schema.table_constraints where table_schema='public'`,
    );
    for (const definition of definitions) {
      const name = getTableName(definition);
      const available = columns
        .filter((c) => c.table_name === name)
        .map((c) => String(c.column_name));
      const missing = Object.values(getTableColumns(definition))
        .map((c) => c.name)
        .filter((c) => !available.includes(c));
      if (
        !constraints.some(
          (c) => c.table_name === name && c.constraint_type === "PRIMARY KEY",
        )
      )
        missing.push("chave primária");
      if (
        constraints.filter(
          (c) => c.table_name === name && c.constraint_type === "FOREIGN KEY",
        ).length < getTableConfig(definition).foreignKeys.length
      )
        missing.push("chaves estrangeiras");
      let count: number | null = null;
      if (!missing.length) {
        const rows = await db.execute(
          sql`select count(*)::int as value from ${sql.identifier(name)} where is_deleted=false`,
        );
        count = Number(rows[0].value);
      }
      tables.push({ name, ok: missing.length === 0, count, missing });
    }
    const bad = await db.execute(
      sql`select r.constraint_name from information_schema.referential_constraints r join information_schema.table_constraints t on t.constraint_schema=r.constraint_schema and t.constraint_name=r.constraint_name where r.constraint_schema='public' and r.delete_rule <> 'RESTRICT' and t.table_name in (${sql.join(
        expected.map((v) => sql`${v}`),
        sql`, `,
      )})`,
    );
    foreignKeys = bad.map((row) => String(row.constraint_name));
    if (tables.every((t) => t.ok)) {
      const totals = await db.execute(
        sql`select count(*)::int as creators, count(*) filter(where coalesce(profile->>'city','')='' or coalesce(profile->>'niche','')='' or coalesce(profile->>'instagram','')='')::int as incomplete from users where role='creator' and is_deleted=false`,
      );
      const missing = await db.execute(
        sql`select count(*)::int as value from users u where u.role='creator' and u.is_deleted=false and not exists(select 1 from audit_log a where a.entity_id=u.id and a.is_deleted=false and a.action='creator cadastrado')`,
      );
      registration = {
        creators: Number(totals[0].creators),
        incompleteProfiles: Number(totals[0].incomplete),
        missingAudit: Number(missing[0].value),
      };
      recent = await db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          createdAt: auditLog.createdAt,
          entityId: auditLog.entityId,
        })
        .from(auditLog)
        .where(and(eq(auditLog.isDeleted, false)))
        .orderBy(desc(auditLog.createdAt))
        .limit(30);
    }
  } catch {
    postgres = {
      ok: false,
      message:
        "Não foi possível verificar o PostgreSQL. Confira conexão e migrações no serviço.",
    };
    tables = [];
  }
  let redis = {
    ok: false,
    message:
      "Redis não configurado. Limites de tentativas estão em memória por instância.",
  };
  if (process.env.REDIS_URL) {
    if (!validRedisUrl(process.env.REDIS_URL))
      redis = {
        ok: false,
        message:
          "REDIS_URL inválida: use redis:// ou rediss://, nunca a URL do PostgreSQL.",
      };
    else
      try {
        const pong = await withRedis(async (client) => {
          const key = `hc:diagnostic:${crypto.randomUUID()}`;
          const response = await client.ping();
          await client.set(key, "ok", { EX: 10 });
          const value = await client.get(key);
          const counter = await client.eval(
            "local n=redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],10); return n",
            { keys: [`${key}:counter`], arguments: [] },
          );
          const ttl = await client.ttl(`${key}:counter`);
          return (
            response === "PONG" &&
            value === "ok" &&
            Number(counter) === 1 &&
            ttl > 0
          );
        });
        redis = {
          ok: pong,
          message: pong
            ? "Redis respondeu PING, leitura/escrita e contador atômico com expiração."
            : "Redis não confirmou leitura/escrita.",
        };
      } catch {
        redis = {
          ok: false,
          message:
            "Redis indisponível ou sem permissão. Confira REDIS_URL e o serviço; o cadastro mantém o limite local de contingência.",
        };
      }
  }
  return {
    checkedAt,
    postgres,
    redis,
    tables,
    registration,
    foreignKeys,
    recent,
  };
}
