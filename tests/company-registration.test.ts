import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { digest } from "../src/lib/security";
import {
  companyRegistrationSchema,
  companyWhatsApp,
} from "../src/lib/company-registration-validation";
import {
  completeCompanyRegistration,
  completePublicCompanyRegistration,
} from "../src/lib/company-registration-service";
config({ quiet: true });
const sample = {
  name: "Empresa QA",
  segment: "Beleza",
  city: "Salvador",
  contactName: "Contato QA",
  email: "contato@example.com",
  phone: "(71) 99999-9999",
  website: "",
  consent: true,
};

test("cadastro externo valida contato e consentimento e impede alteração de etapa pelo cliente", () => {
  const parsed = companyRegistrationSchema.parse({
    ...sample,
    stage: "Contrato",
    id: randomUUID(),
  });
  assert.equal(parsed.phone, "71999999999");
  assert.ok(!("stage" in parsed));
  assert.ok(!("id" in parsed));
  for (const patch of [
    { consent: false },
    { website: "spam" },
    { phone: "123" },
    { email: "inválido" },
  ])
    assert.equal(
      companyRegistrationSchema.safeParse({ ...sample, ...patch }).success,
      false,
    );
  const url = new URL(companyWhatsApp("Marca & Filhos"));
  assert.equal(url.pathname, "/5571920017753");
  assert.match(url.searchParams.get("text")!, /Marca & Filhos/);
});

test(
  "PostgreSQL: cadastro externo é atômico, auditado, não cria login e impede reutilização do link",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 }),
      db = drizzle(sql, { schema });
    const rollback = new Error("rollback teste");
    try {
      await assert.rejects(
        db.transaction(async (tx) => {
          const actor = randomUUID(),
            raw = randomBytes(32).toString("hex"),
            offerRaw = randomBytes(32).toString("hex");
          await tx.insert(schema.users).values({
            id: actor,
            name: "Admin QA",
            email: `${actor}@example.com`,
            password: "hash QA",
            role: "admin",
            modifiedBy: actor,
          });
          const [invite] = await tx
            .insert(schema.companyRegistrationInvites)
            .values({
              tokenHash: digest(raw),
              expiresAt: new Date(Date.now() + 60000).toISOString(),
              modifiedBy: actor,
            })
            .returning();
          await completeCompanyRegistration(
            tx as unknown as ReturnType<typeof drizzle<typeof schema>>,
            raw,
            companyRegistrationSchema.parse({
              ...sample,
              name: `Empresa QA ${actor}`,
            }),
            offerRaw,
          );
          const [used] = await tx
            .select()
            .from(schema.companyRegistrationInvites)
            .where(eq(schema.companyRegistrationInvites.id, invite.id));
          assert.ok(used.companyId);
          const [company] = await tx
            .select()
            .from(schema.companies)
            .where(eq(schema.companies.id, used.companyId!));
          assert.equal(company.stage, "Contato feito");
          assert.match(company.contact, /contato@example.com/);
          const [offerInvite] = await tx
            .select()
            .from(schema.offerInvites)
            .where(eq(schema.offerInvites.companyId, company.id));
          assert.equal(offerInvite.tokenHash, digest(offerRaw));
          assert.notEqual(offerInvite.tokenHash, digest(raw));
          const logs = await tx
            .select()
            .from(schema.auditLog)
            .where(eq(schema.auditLog.entityId, company.id));
          assert.equal(logs.length, 1);
          const accounts = await tx
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, sample.email));
          assert.equal(accounts.length, 0);
          await assert.rejects(
            completeCompanyRegistration(
              tx as unknown as ReturnType<typeof drizzle<typeof schema>>,
              raw,
              companyRegistrationSchema.parse(sample),
              randomBytes(32).toString("hex"),
            ),
            /já foi utilizado/,
          );
          throw rollback;
        }),
        (error) => error === rollback,
      );
    } finally {
      await sql.end();
    }
  },
);

test(
  "PostgreSQL: link fixo cadastra várias empresas sem convite e mantém ofertas isoladas",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const client = postgres(process.env.DATABASE_URL!, { max: 1 }),
      db = drizzle(client, { schema });
    const rollback = new Error("rollback link fixo");
    try {
      await assert.rejects(
        db.transaction(async (tx) => {
          const actor = randomUUID();
          await tx
            .insert(schema.users)
            .values({
              id: actor,
              name: "Admin QA",
              email: actor + "@example.com",
              password: "hash QA",
              role: "admin",
              modifiedBy: actor,
            });
          const tokens = [
            randomBytes(32).toString("hex"),
            randomBytes(32).toString("hex"),
          ];
          const typedDb = tx as unknown as ReturnType<
            typeof drizzle<typeof schema>
          >;
          const names = ["Empresa A QA " + actor, "Empresa B QA " + actor];
          for (let i = 0; i < 2; i++) {
            await completePublicCompanyRegistration(
              typedDb,
              companyRegistrationSchema.parse({ ...sample, name: names[i] }),
              tokens[i],
            );
            const [company] = await tx
              .select()
              .from(schema.companies)
              .where(eq(schema.companies.name, names[i]));
            assert.equal(company.stage, "Contato feito");
            const [invite] = await tx
              .select()
              .from(schema.offerInvites)
              .where(eq(schema.offerInvites.companyId, company.id));
            assert.equal(invite.tokenHash, digest(tokens[i]));
            const logs = await tx
              .select()
              .from(schema.auditLog)
              .where(eq(schema.auditLog.entityId, company.id));
            assert.equal(logs.length, 1);
            const registrations = await tx
              .select()
              .from(schema.companyRegistrationInvites)
              .where(
                eq(schema.companyRegistrationInvites.companyId, company.id),
              );
            assert.equal(registrations.length, 0);
          }
          await assert.rejects(
            completePublicCompanyRegistration(
              typedDb,
              companyRegistrationSchema.parse({ ...sample, name: names[0] }),
              randomBytes(32).toString("hex"),
            ),
            /já está cadastrada/,
          );
          const accounts = await tx
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, sample.email));
          assert.equal(accounts.length, 0);
          throw rollback;
        }),
        (error) => error === rollback,
      );
    } finally {
      await client.end();
    }
  },
);
