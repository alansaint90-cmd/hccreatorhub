import { z } from "zod";
import { companySchema, label } from "./validators";

export const companyRegistrationSchema = companySchema
  .omit({ stage: true, contact: true })
  .extend({
    contactName: label,
    email: z
      .email("Informe um e-mail válido.")
      .max(254)
      .transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{10,13}$/, "Informe o telefone com DDD.")),
    website: z.literal(""),
    consent: z.literal(true, { error: "Autorize o contato para continuar." }),
  });
export function companyWhatsApp(name: string) {
  return `https://wa.me/5571920017753?text=${encodeURIComponent(`Olá, equipe HC Agency! Cadastrei a empresa ${name} e gostaria de conversar sobre uma oferta e fechar uma parceria.`)}`;
}
