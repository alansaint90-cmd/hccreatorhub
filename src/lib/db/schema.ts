import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["super_admin", "admin", "operador", "visualizador", "creator"]);
export const opportunityStatus = pgEnum("opportunity_status", ["Rascunho", "Publicada", "Encerrada"]);
export const applicationStatus = pgEnum("application_status", ["Em análise", "Aprovado", "Reprovado"]);
export const partnershipStatus = pgEnum("partnership_status", ["Aguardando aceite", "Em produção", "Concluída"]);
export const deliveryStatus = pgEnum("delivery_status", ["Em análise", "Aprovado", "Ajuste solicitado"]);
export const financeStatus = pgEnum("finance_status", ["Pendente", "Recebido", "Repassado"]);
const auditFields = () => ({
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  modifiedBy: uuid("modified_by")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "restrict" }),
});
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("creator"),
  profile: jsonb("profile").$type<Record<string, string>>().notNull().default({}),
  ...auditFields(),
});
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  ...auditFields(),
});
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  segment: text("segment").notNull(),
  city: text("city").notNull(),
  contact: text("contact").notNull(),
  stage: text("stage").notNull(),
  ...auditFields(),
});
export type OpportunityDetails = {
  description: string;
  niche: string;
  city: string;
  mode: string;
  reward: string;
  deliverables: string;
  deadline: string;
  vacancies: number;
  conditions: string;
  network: string;
  bannerUrl?: string;
  campaignUrl?: string;
  supportMaterials?: { title: string; url: string }[];
  isDemo?: boolean;
};
export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    status: opportunityStatus("status").notNull(),
    details: jsonb("details").$type<OpportunityDetails>().notNull(),
    ...auditFields(),
  },
  (t) => [index("opportunity_status_idx").on(t.status)],
);
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "restrict" }),
    status: applicationStatus("status").notNull().default("Em análise"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    ...auditFields(),
  },
  (t) => [
    uniqueIndex("application_creator_opportunity").on(t.creatorId, t.opportunityId),
    index("application_creator_idx").on(t.creatorId),
  ],
);
export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    body: jsonb("body")
      .$type<{ creator: string; campaign: string; scope: string; reward: string; deadline: string }>()
      .notNull(),
    ...auditFields(),
  },
  (t) => [uniqueIndex("proposal_version").on(t.applicationId, t.version)],
);
export const partnerships = pgTable("partnerships", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: "restrict" }),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  status: partnershipStatus("status").notNull().default("Aguardando aceite"),
  accepted: boolean("accepted").notNull().default(false),
  brief: jsonb("brief").$type<OpportunityDetails>().notNull(),
  ...auditFields(),
});
export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnershipId: uuid("partnership_id")
    .notNull()
    .references(() => partnerships.id, { onDelete: "restrict" }),
  url: text("url").notNull(),
  note: text("note").notNull(),
  status: deliveryStatus("status").notNull().default("Em análise"),
  ...auditFields(),
});
export const finance = pgTable(
  "finance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnershipId: uuid("partnership_id")
      .notNull()
      .unique()
      .references(() => partnerships.id, { onDelete: "restrict" }),
    companyCents: integer("company_cents").notNull(),
    platformCents: integer("platform_cents").notNull(),
    creatorCents: integer("creator_cents").notNull(),
    benefit: text("benefit").notNull(),
    status: financeStatus("status").default("Pendente").notNull(),
    ...auditFields(),
  },
  (t) => [
    check("nonnegative_amounts", sql`${t.companyCents} >= 0 AND ${t.platformCents} >= 0 AND ${t.creatorCents} >= 0`),
    check("balanced_amounts", sql`${t.companyCents} = ${t.platformCents} + ${t.creatorCents}`),
  ],
);
export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnershipId: uuid("partnership_id")
    .notNull()
    .references(() => partnerships.id, { onDelete: "restrict" }),
  destination: text("destination").notNull(),
  ...auditFields(),
});
export const clicks = pgTable("clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkId: uuid("link_id")
    .notNull()
    .references(() => links.id, { onDelete: "restrict" }),
  ...auditFields(),
});
export const notices = pgTable("notices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  message: text("message").notNull(),
  ...auditFields(),
});
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  entityId: uuid("entity_id").notNull(),
  ...auditFields(),
});
