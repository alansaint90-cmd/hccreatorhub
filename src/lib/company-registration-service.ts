import { and, eq, gt } from "drizzle-orm";
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
    const [existing] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(eq(companies.name, data.name), eq(companies.isDeleted, false)),
      );
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
        modifiedBy: owner.id,
      })
      .returning();
    await tx
      .update(invites)
      .set({ companyId: company.id, updatedAt: new Date().toISOString() })
      .where(eq(invites.id, invite.id));
    const [offerInvite] = await tx
      .insert(offerInvites)
      .values({
        companyId: company.id,
        tokenHash: digest(offerTokenRaw),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        modifiedBy: owner.id,
      })
      .returning();
    await tx.insert(auditLog).values([
      {
        action: "empresa cadastrada pelo formulário externo autorizado",
        entityId: company.id,
        modifiedBy: owner.id,
      },
      {
        action: "link de cadastro de empresa utilizado",
        entityId: invite.id,
        modifiedBy: owner.id,
      },
      {
        action: "link de ofertas criado após cadastro de empresa",
        entityId: offerInvite.id,
        modifiedBy: owner.id,
      },
    ]);
  });
}
