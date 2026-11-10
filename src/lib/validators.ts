import { z } from "zod";
export const label = z
  .string()
  .trim()
  .min(2, "Informe pelo menos 2 caracteres.")
  .max(200)
  .regex(/^[^<>\x00-\x1f]+$/u, "Remova os caracteres inválidos.");
const paragraph = z
  .string()
  .trim()
  .min(3, "Preencha este campo.")
  .max(4000)
  .regex(/^[^<>\x00]+$/u, "Remova os caracteres inválidos.");
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Informe uma data válida.");
export function isPublicHttps(raw: string) {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      host.includes(".") &&
      !/^[\d.]+$|:/.test(host) &&
      !/(^localhost$|\.(local|internal|localhost)$)/i.test(host)
    );
  } catch {
    return false;
  }
}
export const httpsUrl = z.string().max(2048).refine(isPublicHttps, "Use um endereço HTTPS público, sem credenciais.");
export const bannerUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      value === "" ||
      isPublicHttps(value) ||
      /^\/media\/banners\/[0-9a-f-]{36}$/.test(value) ||
      /^\/images\/campaigns\/[a-z0-9-]+\.(?:svg|webp)$/.test(value),
    "Envie uma imagem ou informe uma URL HTTPS pública.",
  );
export const campaignResourceUrl = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      isPublicHttps(value) ||
      /^\/campaign-materials\/(leve-lava|brand-experience|lifestyle-movimento)\/(briefing|referencias)$/.test(value),
    "Use um link HTTPS público válido.",
  );
export const supportMaterialSchema = z.object({ title: label, url: campaignResourceUrl });
export const supportMaterialsSchema = z
  .preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      if (!value.trim()) return [];
      return value
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => {
          const separator = line.indexOf("|");
          return separator < 0
            ? { title: "Material de apoio", url: line.trim() }
            : { title: line.slice(0, separator).trim(), url: line.slice(separator + 1).trim() };
        });
    },
    z.array(supportMaterialSchema).max(20, "Adicione no máximo 20 links."),
  )
  .default([]);
export const loginSchema = z.object({
  email: z
    .email("Informe um e-mail válido.")
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12, "A senha precisa de 12 caracteres.").max(128),
});
export const registerSchema = loginSchema.extend({ name: label });
export const companySchema = z.object({
  name: label,
  segment: label,
  city: label,
  contact: label,
  stage: z.enum(["Prospecção", "Contato feito", "Em negociação", "Contrato"]),
});
export const opportunitySchema = z.object({
  companyId: z.uuid(),
  title: label,
  status: z.enum(["Rascunho", "Publicada", "Encerrada"]),
  description: paragraph,
  niche: label,
  city: label,
  mode: z.enum(["Remunerada", "Permuta / kit", "Híbrida"]),
  reward: label,
  deliverables: paragraph,
  deadline: calendarDate,
  vacancies: z.coerce.number().int().min(1).max(10000),
  conditions: paragraph,
  network: z.enum(["Instagram", "TikTok", "YouTube", "Multiplataforma"]),
  bannerUrl: bannerUrlSchema.default(""),
  campaignUrl: z.union([z.literal(""), campaignResourceUrl]).default(""),
  supportMaterials: supportMaterialsSchema,
});
export const versionSchema = z.object({ id: z.uuid(), updatedAt: z.string().min(10).max(50) });
export const profileSchema = z.object({
  bio: z
    .string()
    .max(1500)
    .regex(/^[^<>\x00]*$/u, "Remova os caracteres inválidos.")
    .default(""),
  photoUrl: z.union([z.literal(""), httpsUrl]).default(""),
  portfolioImages: z
    .string()
    .max(16000)
    .refine((value) => {
      const urls = value
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean);
      return urls.length <= 8 && urls.every(isPublicHttps);
    }, "Informe até 8 URLs HTTPS de imagens, uma por linha.")
    .default(""),
  mediaLinks: z
    .string()
    .max(20000)
    .refine((value) => supportMaterialsSchema.safeParse(value).success, "Informe links HTTPS válidos, um por linha.")
    .default(""),
  city: label,
  niche: label,
  instagram: z.string().regex(/^@?[a-zA-Z0-9_.]{1,30}$/, "Informe um perfil válido."),
  followers: z.string().regex(/^\d{1,12}$/, "Informe o número de seguidores."),
  engagement: z.string().regex(/^\d{1,2}([.,]\d{1,2})?$|^100$/, "Informe um percentual de 0 a 100."),
  metricsDate: calendarDate.refine(
    (v) =>
      v <=
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    "A data de referência não pode ser futura.",
  ),
  portfolio: z.union([z.literal(""), httpsUrl]),
});
export const moneySchema = z.coerce.number().int().min(0).max(2147483647);
export const proposalBody = z.object({
  creator: label,
  campaign: label,
  scope: paragraph,
  reward: label,
  deadline: calendarDate,
});
