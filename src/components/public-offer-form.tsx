"use client";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { offerIntakeSchema } from "@/lib/offer-validation";
import { submitCompanyOffer } from "@/lib/offer-actions";
import { Button } from "./ui";
import { Brand } from "./brand";
import { companyWhatsApp } from "@/lib/company-registration-validation";

export function PublicOfferForm({
  token,
  company,
}: {
  token: string;
  company: string;
}) {
  const [done, setDone] = useState(false),
    [error, setError] = useState("");
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(offerIntakeSchema as never) as Resolver<
      Record<string, string>
    >,
    mode: "onChange",
    defaultValues: {
      website: "",
      title: "",
      description: "",
      niche: "",
      city: "",
      reward: "",
      deliverables: "",
      deadline: "",
      conditions: "A combinar com a equipe.",
      vacancies: "1",
      network: "Instagram",
      mode: "Remunerada",
      bannerUrl: "",
      campaignUrl: "",
      supportMaterials: "",
      contactName: "",
      contactEmail: "",
    },
  });
  function field(name: string, label: string, type = "text", optional = false) {
    return (
      <label key={name}>
        {label}
        {!optional && " *"}
        {type === "textarea" ? (
          <textarea rows={4} {...form.register(name)} />
        ) : (
          <input type={type} {...form.register(name)} />
        )}
        <small className="field-error">
          {form.formState.errors[name]?.message}
        </small>
      </label>
    );
  }
  function select(name: string, label: string, options: string[]) {
    return (
      <label>
        {label} *
        <select {...form.register(name)}>
          {options.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <small className="field-error">
          {form.formState.errors[name]?.message}
        </small>
      </label>
    );
  }
  return (
    <main id="main" className="public-offer">
      <header>
        <Brand />
        <span>PARCERIAS COM MARCAS</span>
      </header>
      <section className="public-offer-card">
        <span className="eyebrow">HC AGENCY / {company}</span>
        <h1>Sua próxima conexão começa com uma ideia.</h1>
        <p>
          Envie sua oferta para a nossa equipe. O envio não publica uma campanha
          e não cria uma conta de empresa.
        </p>
        {done ? (
          <div role="status">
            <h2>Oferta recebida!</h2>
            <p>
              A HC Agency vai analisar as informações e entrar em contato pelo
              e-mail informado. Obrigado pela conexão.
            </p>
            <a className="button primary" href={companyWhatsApp(company)} target="_blank" rel="noopener noreferrer">Conversar com a equipe pelo WhatsApp</a>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(async (values) => {
              setError("");
              try {
                const r = await submitCompanyOffer(token, values);
                if (r.ok) setDone(true);
                else setError(r.error);
              } catch {
                setError(
                  "Não foi possível enviar. Confira sua conexão e tente novamente.",
                );
              }
            })}
          >
            <h2>Contato da empresa</h2>
            <div className="public-offer-grid">
              {field("contactName", "Seu nome")}
              {field("contactEmail", "E-mail para contato", "email")}
            </div>
            <h2>A oferta</h2>
            {field("title", "Nome da campanha")}
            {field("description", "Descreva a proposta", "textarea")}
            <div className="public-offer-grid">
              {field("niche", "Nicho / segmento")}
              {field("city", "Localização")}
              {select("mode", "Modalidade", [
                "Remunerada",
                "Permuta / kit",
                "Híbrida",
              ])}
              {select("network", "Rede social", [
                "Instagram",
                "TikTok",
                "YouTube",
                "Multiplataforma",
              ])}
              {field("deadline", "Prazo da campanha", "date")}
              {field("vacancies", "Quantidade de creators", "number")}
            </div>
            {field("reward", "Valor ou benefício oferecido")}
            {field(
              "deliverables",
              "Conteúdos e entregas esperadas",
              "textarea",
            )}
            {field("conditions", "Requisitos e condições", "textarea")}
            <h2>Imagem e materiais de apoio</h2>
            <p>
              Informe links HTTPS. Os materiais serão revisados pela equipe e
              liberados ao creator somente após o aceite da parceria.
            </p>
            {field("bannerUrl", "Link da imagem do banner", "url", true)}
            {field("campaignUrl", "Link principal da campanha", "url", true)}
            {field(
              "supportMaterials",
              "Links de apoio — um por linha: Título | https://...",
              "textarea",
              true,
            )}
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
              Autorizo a HC Agency a usar os dados enviados para analisar esta
              oferta e entrar em contato. *
            </label>
            <small className="field-error">
              {form.formState.errors.consent?.message}
            </small>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              busy={form.formState.isSubmitting}
              disabled={!form.formState.isValid}
            >
              Enviar oferta para análise
            </Button>
          </form>
        )}
      </section>
      <footer>HC Agency · Conexões que criam possibilidades.</footer>
    </main>
  );
}
