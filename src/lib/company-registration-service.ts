import { and, eq, gt, inArray, asc, count, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "./db";
import {
  companyRegistrationInvites as invites,
  companies,
  offerInvites,
  auditLog,
  users,
} from "./db/schema";
import { digest } from "./security";
import { isAdministrator } from "./offer-validation";
import { companyRegistrationSchema } from "./company-registration-validation";
export async function completeCompanyRegistration(
  db: Database,
  raw: string,
  data: z.output<typeof companyRegistrationSchema>,
  offerTokenRaw: string,
) {
  await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.tokenHash, digest(raw)),
          eq(invites.isDeleted, false),
          gt(invites.expiresAt, new Date().toISOString()),
        ),
      )
      .for("update");
    if (!invite || invite.companyId)
      throw new Error(
        "Este link já foi utilizado ou expirou. Solicite um novo link à equipe.",
      );
    const [owner] = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, invite.modifiedBy), eq(users.isDeleted, false)));
    if (!owner || !isAdministrator(owner.role))
      throw new Error("Link indisponível.");
    const company = await saveCompany(tx, data, owner.id, offerTokenRaw);
    await tx
      .update(invites)
      .set({ companyId: company.id, updatedAt: new Date().toISOString() })
      .where(eq(invites.id, invite.id));
    await tx
      .insert(auditLog)
      .values({
        action: "link de cadastro de empresa utilizado",
        entityId: invite.id,
        modifiedBy: owner.id,
      });
  });
}

type RegistrationData = z.output<typeof companyRegistrationSchema>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
async function saveCompany(
  tx: Transaction,
  data: RegistrationData,
  ownerId: string,
  offerTokenRaw: string,
) {
  const [existing] = await tx
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.name, data.name), eq(companies.isDeleted, false)));
  if (existing)
    throw new Error(
      "Esta empresa já está cadastrada. Entre em contato com a equipe.",
    );
  const [company] = await tx
    .insert(companies)
    .values({
      name: data.name,
      city: data.city,
      segment: data.segment,
      contact: `${data.contactName} · ${data.email} · ${data.phone}`,
      stage: "Contato feito",
      modifiedBy: ownerId,
    })
    .returning();
  const [offerInvite] = await tx
    .insert(offerInvites)
    .values({
      companyId: company.id,
      tokenHash: digest(offerTokenRaw),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      modifiedBy: ownerId,
    })
    .returning();
  await tx.insert(auditLog).values([
    {
      action: "empresa cadastrada pelo formulário externo autorizado",
      entityId: company.id,
      modifiedBy: ownerId,
    },
    {
      action: "link de ofertas criado após cadastro de empresa",
      entityId: offerInvite.id,
      modifiedBy: ownerId,
    },
  ]);
  return company;
}

export async function completePublicCompanyRegistration(
  db: Database,
  data: RegistrationData,
  offerTokenRaw: string,
) {
  await db.transaction(async (tx) => {
    // The shared URL admits new companies, never access to existing company records.
    await tx.execute(sql`select pg_advisory_xact_lock(763194021)`);
    const [recent] = await tx
      .select({ value: count() })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.isDeleted, false),
          eq(
            auditLog.action,
            "empresa cadastrada pelo formulário externo autorizado",
          ),
          gt(auditLog.createdAt, new Date(Date.now() - 3600000).toISOString()),
        ),
      );
    if (recent.value >= 100)
      throw new Error(
        "Muitos cadastros neste momento. Tente mais tarde ou fale com a equipe pelo WhatsApp.",
      );
    const [owner] = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.isDeleted, false),
          inArray(users.role, ["super_admin", "admin"]),
        ),
      )
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(1);
    if (!owner)
      throw new Error(
        "Cadastro temporariamente indisponível. Fale com a equipe pelo WhatsApp.",
      );
    await saveCompany(tx, data, owner.id, offerTokenRaw);
  });
}
