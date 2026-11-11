"use server";
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "./db";
import {
  companyRegistrationInvites as invites,
  auditLog,
  users,
} from "./db/schema";
import { requireSession } from "./auth";
import { digest } from "./security";
import { errorMessage } from "./errors";
import { offerToken, isAdministrator } from "./offer-validation";
import { companyRegistrationSchema } from "./company-registration-validation";
import {
  completeCompanyRegistration,
  completePublicCompanyRegistration,
} from "./company-registration-service";
import { sharedAttempt } from "./redis";

export async function createCompanyRegistrationInvite() {
  try {
    const { user } = await requireSession();
    if (!isAdministrator(user.role))
      throw new Error("Acesso exclusivo da administração.");
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    await getDb().transaction(async (tx) => {
      const [invite] = await tx
        .insert(invites)
        .values({ tokenHash: digest(token), expiresAt, modifiedBy: user.id })
        .returning();
      await tx.insert(auditLog).values({
        action: "link de cadastro de empresa criado",
        entityId: invite.id,
        modifiedBy: user.id,
      });
    });
    return { ok: true as const, path: `/cadastrar-empresa/${token}` };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}

export async function companyRegistrationContext(token: unknown) {
  const parsed = offerToken.safeParse(token);
  if (!parsed.success) return false;
  const [row] = await getDb()
    .select({ role: users.role, companyId: invites.companyId })
    .from(invites)
    .innerJoin(users, eq(users.id, invites.modifiedBy))
    .where(
      and(
        eq(invites.tokenHash, digest(parsed.data)),
        eq(invites.isDeleted, false),
        gt(invites.expiresAt, new Date().toISOString()),
        eq(users.isDeleted, false),
      ),
    );
  return !!row && !row.companyId && isAdministrator(row.role);
}

export async function registerInvitedCompany(token: unknown, input: unknown) {
  try {
    const raw = offerToken.parse(token),
      data = companyRegistrationSchema.parse(input);
    const ip =
      (await headers()).get("x-forwarded-for")?.split(",")[0] || "local";
    await sharedAttempt(`company-registration:${digest(ip)}`, 20, 3600);
    // A different capability is issued for offers; the registration token cannot submit offers.
    const offerTokenRaw = randomBytes(32).toString("hex");
    await completeCompanyRegistration(getDb(), raw, data, offerTokenRaw);
    return {
      ok: true as const,
      offerPath: `/enviar-oferta/${offerTokenRaw}`,
      name: data.name,
    };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}

export async function registerPublicCompany(input: unknown) {
  try {
    const data = companyRegistrationSchema.parse(input);
    const ip =
      (await headers()).get("x-forwarded-for")?.split(",")[0] || "local";
    await sharedAttempt(`company-registration:${digest(ip)}`, 20, 3600);
    const raw = randomBytes(32).toString("hex");
    await completePublicCompanyRegistration(getDb(), data, raw);
    return {
      ok: true as const,
      name: data.name,
      offerPath: `/enviar-oferta/${raw}`,
    };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
