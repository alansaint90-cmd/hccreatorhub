"use server";
import { and, eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import * as s from "./db/schema";
import { requireSession } from "./auth";
import { canFinance, isTeam } from "./security";
import { errorMessage } from "./errors";
import { campaignDetailsForViewer } from "./campaign-access";
export async function loadWorkspace() {
  try {
    const { user } = await requireSession();
    const team = isTeam(user.role);
    const db = getDb();
    const [
      opportunities,
      applications,
      partnerships,
      deliveries,
      companies,
      creators,
      finance,
      notices,
      links,
      proposals,
    ] = await Promise.all([
      db
        .select({
          id: s.opportunities.id,
          title: s.opportunities.title,
          status: s.opportunities.status,
          details: s.opportunities.details,
          company: s.companies.name,
          updatedAt: s.opportunities.updatedAt,
        })
        .from(s.opportunities)
        .innerJoin(s.companies, eq(s.opportunities.companyId, s.companies.id))
        .where(
          and(
            eq(s.opportunities.isDeleted, false),
            eq(s.companies.isDeleted, false),
            team ? undefined : eq(s.opportunities.status, "Publicada"),
          ),
        )
        .orderBy(desc(s.opportunities.createdAt)),
      db
        .select({
          id: s.applications.id,
          creatorId: s.applications.creatorId,
          opportunityId: s.applications.opportunityId,
          status: s.applications.status,
          updatedAt: s.applications.updatedAt,
          title: s.opportunities.title,
          creator: s.users.name,
        })
        .from(s.applications)
        .innerJoin(s.opportunities, eq(s.applications.opportunityId, s.opportunities.id))
        .innerJoin(s.users, eq(s.applications.creatorId, s.users.id))
        .where(
          and(
            eq(s.applications.isDeleted, false),
            eq(s.opportunities.isDeleted, false),
            eq(s.users.isDeleted, false),
            team ? undefined : eq(s.applications.creatorId, user.id),
          ),
        )
        .orderBy(desc(s.applications.createdAt)),
      db
        .select({
          id: s.partnerships.id,
          title: s.opportunities.title,
          creator: s.users.name,
          status: s.partnerships.status,
          accepted: s.partnerships.accepted,
          brief: s.partnerships.brief,
          updatedAt: s.partnerships.updatedAt,
        })
        .from(s.partnerships)
        .innerJoin(s.applications, eq(s.partnerships.applicationId, s.applications.id))
        .innerJoin(s.opportunities, eq(s.applications.opportunityId, s.opportunities.id))
        .innerJoin(s.users, eq(s.partnerships.creatorId, s.users.id))
        .where(
          and(
            eq(s.partnerships.isDeleted, false),
            eq(s.applications.isDeleted, false),
            eq(s.opportunities.isDeleted, false),
            eq(s.users.isDeleted, false),
            team ? undefined : eq(s.partnerships.creatorId, user.id),
          ),
        )
        .orderBy(desc(s.partnerships.createdAt)),
      db
        .select({
          id: s.deliveries.id,
          partnershipId: s.deliveries.partnershipId,
          url: s.deliveries.url,
          note: s.deliveries.note,
          status: s.deliveries.status,
          updatedAt: s.deliveries.updatedAt,
        })
        .from(s.deliveries)
        .innerJoin(s.partnerships, eq(s.deliveries.partnershipId, s.partnerships.id))
        .where(
          and(
            eq(s.deliveries.isDeleted, false),
            eq(s.partnerships.isDeleted, false),
            team ? undefined : eq(s.partnerships.creatorId, user.id),
          ),
        )
        .orderBy(desc(s.deliveries.createdAt)),
      team ? db.select().from(s.companies).where(eq(s.companies.isDeleted, false)).orderBy(s.companies.name) : [],
      team
        ? db
            .select({ id: s.users.id, name: s.users.name, email: s.users.email, profile: s.users.profile })
            .from(s.users)
            .where(and(eq(s.users.role, "creator"), eq(s.users.isDeleted, false)))
            .orderBy(s.users.name)
        : [],
      canFinance(user.role)
        ? db.select().from(s.finance).where(eq(s.finance.isDeleted, false)).orderBy(desc(s.finance.createdAt))
        : [],
      db
        .select({ id: s.notices.id, message: s.notices.message, createdAt: s.notices.createdAt })
        .from(s.notices)
        .where(and(eq(s.notices.userId, user.id), eq(s.notices.isDeleted, false)))
        .orderBy(desc(s.notices.createdAt))
        .limit(20),
      db
        .select({ id: s.links.id, partnershipId: s.links.partnershipId })
        .from(s.links)
        .innerJoin(s.partnerships, eq(s.links.partnershipId, s.partnerships.id))
        .where(
          and(
            eq(s.links.isDeleted, false),
            eq(s.partnerships.isDeleted, false),
            team ? undefined : eq(s.partnerships.creatorId, user.id),
          ),
        ),
      team
        ? db.select().from(s.proposals).where(eq(s.proposals.isDeleted, false)).orderBy(desc(s.proposals.version))
        : [],
    ]);
    return {
      ok: true as const,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          updatedAt: user.updatedAt,
        },
        opportunities: opportunities.map((op) => ({ ...op, details: campaignDetailsForViewer(op.details, team) })),
        applications,
        partnerships: partnerships.map((partnership) => ({
          ...partnership,
          brief: campaignDetailsForViewer(partnership.brief, team || partnership.accepted),
        })),
        deliveries,
        companies,
        creators,
        finance,
        notices,
        links,
        proposals,
      },
    };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
export type Workspace = Extract<Awaited<ReturnType<typeof loadWorkspace>>, { ok: true }>["data"];
