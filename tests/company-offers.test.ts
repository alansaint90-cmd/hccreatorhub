import test from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
import { randomUUID, randomBytes } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import {
  users,
  companies,
  offerInvites,
  companyOffers,
  auditLog,
} from "../src/lib/db/schema";
import {
  offerToken,
  offerIntakeSchema,
  isAdministrator,
} from "../src/lib/offer-validation";
import { validRedisUrl } from "../src/lib/redis";
import { digest } from "../src/lib/security";
config({ quiet: true });
const sample = {
  title: "Oferta de validação",
  description: "Campanha de teste para a equipe.",
  niche: "Lifestyle",
  city: "Brasil",
  mode: "Remunerada",
  reward: "R$ 500,00",
  deliverables: "Um vídeo de apresentação",
  deadline: "2026-12-30",
  vacancies: 2,
  conditions: "A combinar com a equipe.",
  network: "Instagram",
  bannerUrl: "",
  campaignUrl: "",
  supportMaterials: "",
  contactName: "Contato de validação",
  contactEmail: "contato@example.com",
  website: "",
  consent: true,
};
test("oferta pública exige consentimento e contato, bloqueia honeypot e não aceita publicação pelo cliente", () => {
  assert.equal(
    offerIntakeSchema.safeParse({ ...sample, consent: false }).success,
    false,
  );
  assert.equal(
    offerIntakeSchema.safeParse({ ...sample, website: "spam" }).success,
    false,
  );
  assert.equal(
    offerIntakeSchema.safeParse({ ...sample, contactEmail: "invalido" })
      .success,
    false,
  );
  const data = offerIntakeSchema.parse({
    ...sample,
    status: "Publicada",
    companyId: randomUUID(),
  });
  assert.ok(!("status" in data));
  assert.ok(!("companyId" in data));
  assert.ok(!offerToken.safeParse("123").success);
  assert.ok(offerToken.safeParse(randomBytes(32).toString("hex")).success);
});
test("somente administradores gerenciam ofertas e diagnóstico; Redis não aceita URL PostgreSQL", () => {
  for (const role of ["creator", "operador", "visualizador"])
    assert.equal(isAdministrator(role), false);
  assert.equal(isAdministrator("admin"), true);
  assert.equal(isAdministrator("super_admin"), true);
  assert.equal(validRedisUrl("postgres://user:pass@db:5432/base"), false);
  assert.equal(validRedisUrl("redis://localhost:6379"), true);
  assert.equal(validRedisUrl("rediss://redis.example.com:6380"), true);
});
test(
  "PostgreSQL: ofertas e links preservam FKs, token protegido, expiração e exclusão lógica",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const client = postgres(process.env.DATABASE_URL!, { max: 1 });
    const db = drizzle(client);
    const rollback = new Error("rollback QA");
    try {
      await assert.rejects(
        db.transaction(async (tx) => {
          const actor = randomUUID();
          await tx
            .insert(users)
            .values({
              id: actor,
              name: "Admin de teste",
              email: `${actor}@example.com`,
              password: "hash-de-teste",
              role: "admin",
              modifiedBy: actor,
            });
          const [company] = await tx
            .insert(companies)
            .values({
              name: `Empresa QA ${actor}`,
              segment: "Lifestyle",
              city: "Brasil",
              contact: "Equipe",
              stage: "Prospecção",
              modifiedBy: actor,
            })
            .returning();
          const raw = randomBytes(32).toString("hex");
          const [invite] = await tx
            .insert(offerInvites)
            .values({
              companyId: company.id,
              tokenHash: digest(raw),
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
              modifiedBy: actor,
            })
            .returning();
          assert.notEqual(invite.tokenHash, raw);
          const parsed = offerIntakeSchema.parse(sample);
          const {
            title,
            contactName,
            contactEmail,
            website,
            consent,
            ...details
          } = parsed;
          void website;
          void consent;
          const [offer] = await tx
            .insert(companyOffers)
            .values({
              inviteId: invite.id,
              companyId: company.id,
              title,
              contactName,
              contactEmail,
              details,
              modifiedBy: actor,
            })
            .returning();
          await tx
            .insert(auditLog)
            .values({
              action: "oferta enviada pela empresa via formulário autorizado",
              entityId: offer.id,
              modifiedBy: actor,
            });
          assert.equal(offer.opportunityId, null);
          await tx
            .update(offerInvites)
            .set({ isDeleted: true, deletedAt: new Date().toISOString() })
            .where(eq(offerInvites.id, invite.id));
          const active = await tx
            .select()
            .from(offerInvites)
            .where(
              and(
                eq(offerInvites.id, invite.id),
                eq(offerInvites.isDeleted, false),
              ),
            );
          assert.equal(active.length, 0);
          const retained = await tx
            .select()
            .from(companyOffers)
            .where(eq(companyOffers.id, offer.id));
          assert.equal(retained.length, 1);
          throw rollback;
        }),
        (error) => error === rollback,
      );
    } finally {
      await client.end();
    }
  },
);
