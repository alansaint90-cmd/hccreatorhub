"use server";
import { z } from "zod";
import { and, eq, sql, inArray, desc } from "drizzle-orm";
import { getDb } from "./db";
import * as s from "./db/schema";
import { requireSession } from "./auth";
import { canManage, canFinance } from "./security";
import {
  companySchema,
  opportunitySchema,
  profileSchema,
  versionSchema,
  httpsUrl,
  moneySchema,
  proposalBody,
} from "./validators";
import { errorMessage } from "./errors";
const commandSchema = z.enum([
  "company",
  "opportunity",
  "opportunity-status",
  "apply",
  "decision",
  "accept",
  "delivery",
  "review",
  "finance",
  "finance-status",
  "link",
  "profile",
  "proposal",
  "archive-company",
  "company-stage",
  "complete",
]);
export async function executeCommand(command: unknown, input: unknown) {
  try {
    const name = commandSchema.parse(command);
    const { user } = await requireSession();
    const db = getDb();
    await db.transaction(async (tx) => {
      const actor = user.id;
      let entityId = actor;
      const stamp = { updatedAt: sql`now()`, modifiedBy: actor };
      const manage = () => {
        if (!canManage(user.role)) throw new Error("Sem permissão para esta ação.");
      };
      const creator = () => {
        if (user.role !== "creator") throw new Error("Ação exclusiva do creator.");
      };
      const assertChanged = (rows: unknown[]) => {
        if (!rows.length) throw new Error("Registro alterado por outro usuário. Recarregue e tente novamente.");
      };
      const partnership = async (id: string) => {
        const [p] = await tx
          .select()
          .from(s.partnerships)
          .where(and(eq(s.partnerships.id, id), eq(s.partnerships.isDeleted, false)))
          .for("update");
        if (!p || (user.role === "creator" && p.creatorId !== actor)) throw new Error("Parceria não disponível.");
        return p;
      };
      const notify = async (id: string, message: string) => {
        await tx.insert(s.notices).values({ userId: id, message, modifiedBy: actor });
      };
      if (name === "company") {
        manage();
        const data = companySchema.parse(input);
        const [r] = await tx
          .insert(s.companies)
          .values({ ...data, modifiedBy: actor })
          .returning();
        entityId = r.id;
      } else if (name === "opportunity") {
        manage();
        const { companyId, title, status, ...details } = opportunitySchema.parse(input);
        const [company] = await tx
          .select()
          .from(s.companies)
          .where(and(eq(s.companies.id, companyId), eq(s.companies.isDeleted, false)))
          .for("update");
        if (!company) throw new Error("Empresa não disponível.");
        const [r] = await tx
          .insert(s.opportunities)
          .values({ companyId, title, status, details, modifiedBy: actor })
          .returning();
        entityId = r.id;
      } else if (name === "opportunity-status") {
        manage();
        const d = versionSchema.extend({ status: z.enum(["Publicada", "Encerrada", "Rascunho"]) }).parse(input);
        entityId = d.id;
        const [op] = await tx
          .select()
          .from(s.opportunities)
          .where(and(eq(s.opportunities.id, d.id), eq(s.opportunities.isDeleted, false)))
          .for("update");
        if (!op) throw new Error("Oportunidade não disponível.");
        if (d.status === "Publicada") {
          const [company] = await tx
            .select()
            .from(s.companies)
            .where(and(eq(s.companies.id, op.companyId), eq(s.companies.isDeleted, false)))
            .for("update");
          if (!company) throw new Error("Empresa arquivada.");
        }
        assertChanged(
          await tx
            .update(s.opportunities)
            .set({ status: d.status, ...stamp })
            .where(
              and(
                eq(s.opportunities.id, d.id),
                eq(s.opportunities.updatedAt, d.updatedAt),
                eq(s.opportunities.isDeleted, false),
              ),
            )
            .returning(),
        );
      } else if (name === "apply") {
        creator();
        const { id } = z.object({ id: z.uuid() }).parse(input);
        const [op] = await tx
          .select()
          .from(s.opportunities)
          .where(
            and(
              eq(s.opportunities.id, id),
              eq(s.opportunities.status, "Publicada"),
              eq(s.opportunities.isDeleted, false),
            ),
          )
          .for("update");
        if (!op) throw new Error("Oportunidade indisponível.");
        if (!user.profile.niche || !user.profile.city) throw new Error("Complete seu perfil antes de se candidatar.");
        const [a] = await tx
          .insert(s.applications)
          .values({
            creatorId: actor,
            opportunityId: id,
            snapshot: { name: user.name, profile: user.profile, opportunity: op.details },
            modifiedBy: actor,
          })
          .returning();
        entityId = a.id;
        await tx
          .insert(s.proposals)
          .values({
            applicationId: a.id,
            version: 1,
            body: {
              creator: user.name,
              campaign: op.title,
              scope: op.details.deliverables,
              reward: op.details.reward,
              deadline: op.details.deadline,
            },
            modifiedBy: actor,
          });
        const team = await tx
          .select({ id: s.users.id })
          .from(s.users)
          .where(and(inArray(s.users.role, ["super_admin", "admin", "operador"]), eq(s.users.isDeleted, false)));
        for (const t of team) await notify(t.id, `${user.name} se candidatou a ${op.title}.`);
      } else if (name === "decision") {
        manage();
        const d = versionSchema.extend({ status: z.enum(["Aprovado", "Reprovado"]) }).parse(input);
        entityId = d.id;
        const [a] = await tx
          .select()
          .from(s.applications)
          .where(and(eq(s.applications.id, d.id), eq(s.applications.isDeleted, false)))
          .for("update");
        if (!a || a.status !== "Em análise") throw new Error("Esta candidatura já foi decidida.");
        assertChanged(
          await tx
            .update(s.applications)
            .set({ status: d.status, ...stamp })
            .where(and(eq(s.applications.id, d.id), eq(s.applications.updatedAt, d.updatedAt)))
            .returning(),
        );
        if (d.status === "Aprovado") {
          const [op] = await tx
            .select()
            .from(s.opportunities)
            .where(and(eq(s.opportunities.id, a.opportunityId), eq(s.opportunities.isDeleted, false)))
            .for("update");
          if (!op || op.status !== "Publicada") throw new Error("Publique a oportunidade antes de aprovar.");
          const accepted = await tx
            .select({ id: s.applications.id })
            .from(s.applications)
            .where(
              and(
                eq(s.applications.opportunityId, op.id),
                eq(s.applications.status, "Aprovado"),
                eq(s.applications.isDeleted, false),
              ),
            );
          if (accepted.length > op.details.vacancies) throw new Error("Todas as vagas já foram preenchidas.");
          const [proposal] = await tx
            .select()
            .from(s.proposals)
            .where(and(eq(s.proposals.applicationId, a.id), eq(s.proposals.isDeleted, false)))
            .orderBy(desc(s.proposals.version))
            .limit(1);
          const brief = proposal
            ? {
                ...op.details,
                deliverables: proposal.body.scope,
                reward: proposal.body.reward,
                deadline: proposal.body.deadline,
              }
            : op.details;
          await tx
            .insert(s.partnerships)
            .values({ applicationId: a.id, creatorId: a.creatorId, brief, modifiedBy: actor });
        }
        await notify(a.creatorId, `Sua candidatura foi ${d.status.toLowerCase()}.`);
      } else if (name === "accept") {
        creator();
        const d = versionSchema.parse(input);
        const p = await partnership(d.id);
        entityId = p.id;
        if (p.accepted) throw new Error("Condições já aceitas.");
        assertChanged(
          await tx
            .update(s.partnerships)
            .set({ accepted: true, status: "Em produção", ...stamp })
            .where(and(eq(s.partnerships.id, p.id), eq(s.partnerships.updatedAt, d.updatedAt)))
            .returning(),
        );
      } else if (name === "delivery" || name === "link") {
        if (name === "link") manage();
        else creator();
        const d = z.object({ id: z.uuid(), url: httpsUrl, note: z.string().max(2000).default("") }).parse(input);
        const p = await partnership(d.id);
        entityId = p.id;
        if (!p.accepted || p.status === "Concluída") throw new Error("A parceria precisa estar em produção.");
        if (name === "delivery")
          await tx.insert(s.deliveries).values({ partnershipId: p.id, url: d.url, note: d.note, modifiedBy: actor });
        else await tx.insert(s.links).values({ partnershipId: p.id, destination: d.url, modifiedBy: actor });
      } else if (name === "review") {
        manage();
        const d = versionSchema.extend({ status: z.enum(["Aprovado", "Ajuste solicitado"]) }).parse(input);
        entityId = d.id;
        const [delivery] = await tx
          .select()
          .from(s.deliveries)
          .where(and(eq(s.deliveries.id, d.id), eq(s.deliveries.isDeleted, false)))
          .for("update");
        if (!delivery) throw new Error("Entrega não disponível.");
        const p = await partnership(delivery.partnershipId);
        if (p.status === "Concluída") throw new Error("Parceria já concluída.");
        assertChanged(
          await tx
            .update(s.deliveries)
            .set({ status: d.status, ...stamp })
            .where(
              and(
                eq(s.deliveries.id, d.id),
                eq(s.deliveries.updatedAt, d.updatedAt),
                eq(s.deliveries.isDeleted, false),
              ),
            )
            .returning(),
        );
        await notify(p.creatorId, `Revisão do material: ${d.status.toLowerCase()}.`);
      } else if (name === "finance") {
        if (!canFinance(user.role)) throw new Error("Sem permissão para o financeiro.");
        const d = z
          .object({
            id: z.uuid(),
            companyCents: moneySchema,
            platformCents: moneySchema,
            creatorCents: moneySchema,
            benefit: z.string().max(500),
          })
          .parse(input);
        await partnership(d.id);
        entityId = d.id;
        if (d.platformCents + d.creatorCents !== d.companyCents)
          throw new Error("O valor da empresa deve corresponder à soma da plataforma e do creator.");
        await tx.insert(s.finance).values({ ...d, partnershipId: d.id, id: undefined, modifiedBy: actor });
      } else if (name === "finance-status") {
        if (!canFinance(user.role)) throw new Error("Sem permissão para o financeiro.");
        const d = versionSchema.extend({ status: z.enum(["Recebido", "Repassado"]) }).parse(input);
        entityId = d.id;
        const required = d.status === "Recebido" ? "Pendente" : "Recebido";
        assertChanged(
          await tx
            .update(s.finance)
            .set({ status: d.status, ...stamp })
            .where(
              and(
                eq(s.finance.id, d.id),
                eq(s.finance.updatedAt, d.updatedAt),
                eq(s.finance.status, required),
                eq(s.finance.isDeleted, false),
              ),
            )
            .returning(),
        );
      } else if (name === "profile") {
        creator();
        const d = z.object({ profile: profileSchema, updatedAt: z.string() }).parse(input);
        assertChanged(
          await tx
            .update(s.users)
            .set({ profile: { ...d.profile, source: "Informado pelo creator" }, ...stamp })
            .where(and(eq(s.users.id, actor), eq(s.users.updatedAt, d.updatedAt), eq(s.users.isDeleted, false)))
            .returning(),
        );
      } else if (name === "proposal") {
        manage();
        const d = z.object({ id: z.uuid(), version: z.number().int().positive(), body: proposalBody }).parse(input);
        entityId = d.id;
        const [a] = await tx
          .select()
          .from(s.applications)
          .where(and(eq(s.applications.id, d.id), eq(s.applications.isDeleted, false)))
          .for("update");
        if (!a) throw new Error("Candidatura não disponível.");
        await tx
          .insert(s.proposals)
          .values({ applicationId: d.id, version: d.version + 1, body: d.body, modifiedBy: actor });
      } else if (name === "company-stage" || name === "archive-company") {
        manage();
        const d = versionSchema
          .extend({ stage: z.enum(["Prospecção", "Contato feito", "Em negociação", "Contrato"]).optional() })
          .parse(input);
        entityId = d.id;
        const [company] = await tx
          .select()
          .from(s.companies)
          .where(and(eq(s.companies.id, d.id), eq(s.companies.isDeleted, false)))
          .for("update");
        if (!company) throw new Error("Empresa não disponível.");
        if (name === "archive-company") {
          const active = await tx
            .select({ id: s.opportunities.id })
            .from(s.opportunities)
            .where(and(eq(s.opportunities.companyId, d.id), eq(s.opportunities.isDeleted, false)));
          if (active.length) throw new Error("Esta empresa possui oportunidades vinculadas e não pode ser arquivada.");
        } else if (!d.stage) throw new Error("Informe a etapa.");
        assertChanged(
          await tx
            .update(s.companies)
            .set({
              ...stamp,
              ...(name === "archive-company" ? { isDeleted: true, deletedAt: sql`now()` } : { stage: d.stage }),
            })
            .where(
              and(eq(s.companies.id, d.id), eq(s.companies.updatedAt, d.updatedAt), eq(s.companies.isDeleted, false)),
            )
            .returning(),
        );
      } else if (name === "complete") {
        manage();
        const d = versionSchema.parse(input);
        const p = await partnership(d.id);
        entityId = p.id;
        if (p.status !== "Em produção") throw new Error("A parceria precisa estar em produção.");
        const approved = await tx
          .select()
          .from(s.deliveries)
          .where(
            and(
              eq(s.deliveries.partnershipId, p.id),
              eq(s.deliveries.isDeleted, false),
              eq(s.deliveries.status, "Aprovado"),
            ),
          );
        if (!approved.length) throw new Error("Aprove pelo menos uma entrega antes de concluir.");
        assertChanged(
          await tx
            .update(s.partnerships)
            .set({ status: "Concluída", ...stamp })
            .where(and(eq(s.partnerships.id, p.id), eq(s.partnerships.updatedAt, d.updatedAt)))
            .returning(),
        );
        await notify(p.creatorId, "Sua parceria foi concluída pela equipe.");
      }
      await tx.insert(s.auditLog).values({ action: name, entityId, modifiedBy: actor });
    });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
