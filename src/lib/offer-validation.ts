import { z } from "zod";
import { opportunitySchema, label } from "./validators";
export const offerToken = z.string().regex(/^[a-f0-9]{64}$/, "Link inválido.");
export const offerIntakeSchema = opportunitySchema
  .omit({ companyId: true, status: true })
  .extend({
    contactName: label,
    contactEmail: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    website: z.literal(""),
    consent: z.literal(true, {
      error: "Autorize o contato da equipe para enviar.",
    }),
  });
export function isAdministrator(role: string) {
  return role === "admin" || role === "super_admin";
}
