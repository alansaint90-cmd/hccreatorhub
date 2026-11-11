"use client";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  companyRegistrationSchema,
  companyWhatsApp,
} from "@/lib/company-registration-validation";
import { registerInvitedCompany } from "@/lib/company-registration-actions";
import { Brand } from "./brand";
import { Button } from "./ui";

export function PublicCompanyRegistration({ token }: { token: string }) {
  const [done, setDone] = useState<{ name: string; offerPath: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(companyRegistrationSchema as never) as Resolver<
      Record<string, string>
    >,
    mode: "onChange",
    defaultValues: {
      name: "",
      segment: "",
      city: "",
      contactName: "",
      email: "",
      phone: "",
      website: "",
    },
  });
  return (
    <main id="main" className="public-offer">
      <header>
        <Brand />
        <span>CADASTRO DE EMPRESA</span>
      </header>
      <section className="public-offer-card">
        <span className="eyebrow">HC AGENCY / NOVAS CONEXÕES</span>
        <h1>Sua marca. Nossa próxima parceria.</h1>
        {done ? (
          <div role="status">
            <h2>Empresa cadastrada!</h2>
            <p>
              Os dados de {done.name} já estão no sistema da HC Agency. Agora
              você pode enviar sua oferta ou falar com a equipe para negociar a
              parceria.
            </p>
            <div className="intake-controls">
              <a className="button primary" href={done.offerPath}>
                Cadastrar oferta
              </a>
              <a
                className="button outline"
                href={companyWhatsApp(done.name)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Entrar em contato com a equipe pelo WhatsApp
              </a>
            </div>
            <p>
              O envio da oferta não publica uma campanha nem confirma um
              contrato. Nossa equipe conversa com você pelo WhatsApp para
              acertar os detalhes.
            </p>
          </div>
        ) : (
          <>
            <p>
              Preencha os dados da empresa. Depois, você poderá cadastrar uma
              oferta ou conversar com a equipe pelo WhatsApp. Não é necessário
              criar senha.
            </p>
            <form
              onSubmit={form.handleSubmit(async (values) => {
                setError("");
                try {
                  const r = await registerInvitedCompany(token, values);
                  if (r.ok) setDone({ name: r.name, offerPath: r.offerPath });
                  else setError(r.error);
                } catch {
                  setError(
                    "Não foi possível cadastrar. Verifique a conexão e tente novamente.",
                  );
                }
              })}
            >
              <div className="public-offer-grid">
                {[
                  ["name", "Nome da empresa", "text"],
                  ["segment", "Segmento", "text"],
                  ["city", "Cidade", "text"],
                  ["contactName", "Nome do responsável", "text"],
                  ["email", "E-mail de contato", "email"],
                  ["phone", "WhatsApp com DDD", "tel"],
                ].map(([name, label, type]) => (
                  <label key={name}>
                    {label} *
                    <input
                      type={type}
                      {...form.register(name)}
                      aria-invalid={!!form.formState.errors[name]}
                    />
                    <small className="field-error">
                      {form.formState.errors[name]?.message}
                    </small>
                  </label>
                ))}
              </div>
              <div className="intake-honeypot" aria-hidden="true">
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    {...form.register("website")}
                  />
                </label>
              </div>
              <label className="intake-consent">
                <input type="checkbox" {...form.register("consent")} />
                Autorizo a HC Agency a usar os dados para cadastrar a empresa e
                entrar em contato sobre parcerias. *
              </label>
              <small className="field-error">
                {form.formState.errors.consent?.message}
              </small>
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                busy={form.formState.isSubmitting}
                disabled={!form.formState.isValid}
              >
                Cadastrar empresa e continuar
              </Button>
              <p>
                <a
                  href={companyWhatsApp("minha empresa")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Precisa de ajuda? Fale com a equipe pelo WhatsApp
                </a>
              </p>
            </form>
          </>
        )}
      </section>
      <footer>HC Agency · Conexões que criam possibilidades.</footer>
    </main>
  );
}
