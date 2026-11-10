import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import { users, companies, opportunities, applications, partnerships, finance, auditLog } from "../src/lib/db/schema";
config({ quiet: true });
test(
  "PostgreSQL 16: constraints, isolamento por proprietário, exclusão lógica e concorrência",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const client = postgres(process.env.DATABASE_URL!, { max: 1 });
    const db = drizzle(client);
    try {
      const version = await client`show server_version`;
      assert.match(version[0].server_version, /^16\./);
      await assert.rejects(
        db.transaction(async (tx) => {
          const actor = randomUUID(),
            other = randomUUID();
          for (const id of [actor, other])
            await tx
              .insert(users)
              .values({
                id,
                name: "Teste transacional",
                email: `${id}@example.com`,
                password: "hash de teste não utilizável",
                modifiedBy: id,
              });
          const [brand] = await tx
            .insert(companies)
            .values({
              name: randomUUID(),
              segment: "Moda",
              city: "São Paulo",
              contact: "Equipe",
              stage: "Prospecção",
              modifiedBy: actor,
            })
            .returning();
          const brief = {
            description: "Briefing de teste",
            niche: "Moda",
            city: "Brasil",
            mode: "Remunerada",
            reward: "R$ 500",
            deliverables: "Um vídeo",
            deadline: "2026-11-30",
            vacancies: 1,
            conditions: "Conteúdo original",
            network: "Instagram",
          };
          const [op] = await tx
            .insert(opportunities)
            .values({ companyId: brand.id, title: "Teste", status: "Publicada", details: brief, modifiedBy: actor })
            .returning();
          const [app] = await tx
            .insert(applications)
            .values({ creatorId: actor, opportunityId: op.id, snapshot: {}, modifiedBy: actor })
            .returning();
          await assert.rejects(
            tx.transaction(async (nested) => {
              await nested
                .insert(applications)
                .values({ creatorId: actor, opportunityId: op.id, snapshot: {}, modifiedBy: actor });
            }),
          );
          const owned = await tx
            .select()
            .from(applications)
            .where(and(eq(applications.creatorId, other), eq(applications.isDeleted, false)));
          assert.equal(owned.length, 0);
          await assert.rejects(
            tx.transaction(async (nested) => {
              await nested
                .insert(opportunities)
                .values({
                  companyId: randomUUID(),
                  title: "Inválida",
                  status: "Rascunho",
                  details: brief,
                  modifiedBy: actor,
                });
            }),
          );
          const [p] = await tx
            .insert(partnerships)
            .values({ applicationId: app.id, creatorId: actor, brief, modifiedBy: actor })
            .returning();
          await assert.rejects(
            tx.transaction(async (nested) => {
              await nested
                .insert(finance)
                .values({
                  partnershipId: p.id,
                  companyCents: -1,
                  platformCents: 0,
                  creatorCents: 0,
                  benefit: "",
                  modifiedBy: actor,
                });
            }),
          );
          const [changed] = await tx
            .update(companies)
            .set({ stage: "Contrato", updatedAt: sql`clock_timestamp()` })
            .where(and(eq(companies.id, brand.id), eq(companies.updatedAt, brand.updatedAt)))
            .returning();
          assert.ok(changed);
          const conflict = await tx
            .update(companies)
            .set({ stage: "Contato feito" })
            .where(and(eq(companies.id, brand.id), eq(companies.updatedAt, brand.updatedAt)))
            .returning();
          assert.equal(conflict.length, 0);
          await tx
            .update(companies)
            .set({ isDeleted: true, deletedAt: sql`now()`, modifiedBy: actor })
            .where(eq(companies.id, brand.id));
          const visible = await tx
            .select()
            .from(companies)
            .where(and(eq(companies.id, brand.id), eq(companies.isDeleted, false)));
          assert.equal(visible.length, 0);
          await tx.insert(auditLog).values({ action: "teste", entityId: brand.id, modifiedBy: actor });
          const audit = await tx
            .select()
            .from(auditLog)
            .where(and(eq(auditLog.entityId, brand.id), eq(auditLog.isDeleted, false)));
          assert.equal(audit.length, 1);
          throw new Error("ROLLBACK_TESTE");
        }),
        /ROLLBACK_TESTE/,
      );
      const constraints =
        await client`select delete_rule from information_schema.referential_constraints where constraint_schema='public'`;
      assert.ok(constraints.length >= 20);
      assert.ok(constraints.every((c) => c.delete_rule === "RESTRICT"));
    } finally {
      await client.end();
    }
  },
);
