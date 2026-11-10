"use server";
import { randomBytes } from "node:crypto";
import { and, eq, gt, desc, count } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { getDb } from "./db";
import {
  offerInvites,
  companyOffers,
  companies,
  opportunities,
  auditLog,
  users,
} from "./db/schema";
import { requireSession } from "./auth";
import { digest } from "./security";
import { versionSchema } from "./validators";
import {
  offerIntakeSchema,
  offerToken,
  isAdministrator,
} from "./offer-validation";
import { errorMessage } from "./errors";
import { sharedAttempt } from "./redis";

async function administrator() {
  const session = await requireSession();
  if (!isAdministrator(session.user.role))
    throw new Error("Acesso exclusivo da administração.");
  return session.user;
}
export async function createOfferInvite(companyId: unknown) {
  try {
    const user = await administrator(),
      id = z.uuid().parse(companyId),
      raw = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    await getDb().transaction(async (tx) => {
      const [company] = await tx
        .select()
        .from(companies)
        .where(and(eq(companies.id, id), eq(companies.isDeleted, false)))
        .for("update");
      if (!company) throw new Error("Empresa não disponível.");
      const revoked = await tx
        .update(offerInvites)
        .set({
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modifiedBy: user.id,
        })
        .where(
          and(
            eq(offerInvites.companyId, id),
            eq(offerInvites.isDeleted, false),
          ),
        )
        .returning();
      for (const old of revoked)
        await tx
          .insert(auditLog)
          .values({
            action: "link de ofertas revogado",
            entityId: old.id,
            modifiedBy: user.id,
          });
      const [invite] = await tx
        .insert(offerInvites)
        .values({
          companyId: id,
          tokenHash: digest(raw),
          expiresAt,
          modifiedBy: user.id,
        })
        .returning();
      await tx
        .insert(auditLog)
        .values({
          action: "link de ofertas criado",
          entityId: invite.id,
          modifiedBy: user.id,
        });
    });
    return { ok: true as const, path: `/enviar-oferta/${raw}`, expiresAt };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function offerFormContext(token: unknown) {
  const parsed = offerToken.safeParse(token);
  if (!parsed.success) return null;
  const [row] = await getDb()
    .select({ name: companies.name })
    .from(offerInvites)
    .innerJoin(companies, eq(companies.id, offerInvites.companyId))
    .innerJoin(users, eq(users.id, offerInvites.modifiedBy))
    .where(
      and(
        eq(offerInvites.tokenHash, digest(parsed.data)),
        eq(offerInvites.isDeleted, false),
        gt(offerInvites.expiresAt, new Date().toISOString()),
        eq(companies.isDeleted, false),
        eq(users.isDeleted, false),
      ),
    );
  return row ?? null;
}
export async function submitCompanyOffer(token: unknown, input: unknown) {
  try {
    const raw = offerToken.parse(token),
      data = offerIntakeSchema.parse(input);
    const ip =
      (await headers()).get("x-forwarded-for")?.split(",")[0] || "local";
    await sharedAttempt(`offer:${digest(ip)}`, 20, 3600);
    await getDb().transaction(async (tx) => {
      const [invite] = await tx
        .select()
        .from(offerInvites)
        .where(
          and(
            eq(offerInvites.tokenHash, digest(raw)),
            eq(offerInvites.isDeleted, false),
            gt(offerInvites.expiresAt, new Date().toISOString()),
          ),
        )
        .for("update");
      if (!invite)
        throw new Error(
          "Link expirado ou indisponível. Solicite um novo link à HC Agency.",
        );
      const [company] = await tx
        .select()
        .from(companies)
        .where(
          and(
            eq(companies.id, invite.companyId),
            eq(companies.isDeleted, false),
          ),
        );
      const [owner] = await tx
        .select()
        .from(users)
        .where(
          and(eq(users.id, invite.modifiedBy), eq(users.isDeleted, false)),
        );
      if (!company || !owner || !isAdministrator(owner.role))
        throw new Error("Link indisponível.");
      const [total] = await tx
        .select({ value: count() })
        .from(companyOffers)
        .where(
          and(
            eq(companyOffers.inviteId, invite.id),
            eq(companyOffers.isDeleted, false),
          ),
        );
      if (total.value >= 50)
        throw new Error(
          "Limite de envios deste link atingido. Contate a equipe.",
        );
      const { contactName, contactEmail, title, consent, website, ...details } =
        data;
      void consent;
      void website;
      const [offer] = await tx
        .insert(companyOffers)
        .values({
          companyId: company.id,
          inviteId: invite.id,
          title,
          contactName,
          contactEmail,
          details,
          modifiedBy: owner.id,
        })
        .returning();
      await tx
        .insert(auditLog)
        .values({
          action: "oferta enviada pela empresa via formulário autorizado",
          entityId: offer.id,
          modifiedBy: owner.id,
        });
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function listCompanyOffers() {
  try {
    await administrator();
    const db = getDb();
    const offers = await db
      .select({
        id: companyOffers.id,
        title: companyOffers.title,
        company: companies.name,
        contactName: companyOffers.contactName,
        contactEmail: companyOffers.contactEmail,
        details: companyOffers.details,
        opportunityId: companyOffers.opportunityId,
        updatedAt: companyOffers.updatedAt,
        createdAt: companyOffers.createdAt,
      })
      .from(companyOffers)
      .innerJoin(companies, eq(companies.id, companyOffers.companyId))
      .where(
        and(eq(companyOffers.isDeleted, false), eq(companies.isDeleted, false)),
      )
      .orderBy(desc(companyOffers.createdAt))
      .limit(100);
    const invites = await db
      .select({
        id: offerInvites.id,
        company: companies.name,
        expiresAt: offerInvites.expiresAt,
        updatedAt: offerInvites.updatedAt,
      })
      .from(offerInvites)
      .innerJoin(companies, eq(companies.id, offerInvites.companyId))
      .where(
        and(
          eq(offerInvites.isDeleted, false),
          eq(companies.isDeleted, false),
          gt(offerInvites.expiresAt, new Date().toISOString()),
        ),
      )
      .orderBy(desc(offerInvites.createdAt))
      .limit(100);
    return { ok: true as const, offers, invites };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function revokeOfferInvite(input: unknown) {
  try {
    const user = await administrator(),
      data = versionSchema.parse(input);
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .update(offerInvites)
        .set({
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modifiedBy: user.id,
        })
        .where(
          and(
            eq(offerInvites.id, data.id),
            eq(offerInvites.updatedAt, data.updatedAt),
            eq(offerInvites.isDeleted, false),
          ),
        )
        .returning();
      if (!row) throw new Error("Link alterado. Recarregue a lista.");
      await tx
        .insert(auditLog)
        .values({
          action: "link de ofertas revogado",
          entityId: row.id,
          modifiedBy: user.id,
        });
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export async function convertCompanyOffer(input: unknown) {
  try {
    const user = await administrator(),
      data = versionSchema.parse(input);
    await getDb().transaction(async (tx) => {
      const [offer] = await tx
        .select()
        .from(companyOffers)
        .innerJoin(companies, eq(companies.id, companyOffers.companyId))
        .where(
          and(
            eq(companyOffers.id, data.id),
            eq(companyOffers.isDeleted, false),
            eq(companyOffers.updatedAt, data.updatedAt),
            eq(companies.isDeleted, false),
          ),
        )
        .for("update");
      if (!offer || offer.company_offers.opportunityId)
        throw new Error("Oferta já tratada ou alterada. Recarregue.");
      const row = offer.company_offers;
      const [campaign] = await tx
        .insert(opportunities)
        .values({
          companyId: row.companyId,
          title: row.title,
          details: row.details,
          status: "Rascunho",
          modifiedBy: user.id,
        })
        .returning();
      await tx
        .update(companyOffers)
        .set({
          opportunityId: campaign.id,
          updatedAt: new Date().toISOString(),
          modifiedBy: user.id,
        })
        .where(eq(companyOffers.id, row.id));
      await tx.insert(auditLog).values([
        {
          action: "campanha rascunho criada a partir de oferta",
          entityId: campaign.id,
          modifiedBy: user.id,
        },
        {
          action: "oferta convertida em rascunho",
          entityId: row.id,
          modifiedBy: user.id,
        },
      ]);
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
