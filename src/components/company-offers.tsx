"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  createOfferInvite,
  listCompanyOffers,
  revokeOfferInvite,
  convertCompanyOffer,
} from "@/lib/offer-actions";
import { Button, Modal, Confirm } from "./ui";
import { CampaignMaterials } from "./campaign-materials";
type OfferList = Extract<
  Awaited<ReturnType<typeof listCompanyOffers>>,
  { ok: true }
>;
export function CompanyOffers({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const [company, setCompany] = useState("");
  const [link, setLink] = useState("");
  const [result, setResult] = useState<OfferList | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<OfferList["offers"][number] | null>(
      null,
    );
  const [action, setAction] = useState<{
    title: string;
    run: () => Promise<void>;
  } | null>(null);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await listCompanyOffers();
      if (r.ok) setResult(r);
      else setError(r.error);
    } catch {
      setError("Não foi possível carregar as ofertas.");
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    try {
      const r = await createOfferInvite(company);
      if (r.ok) {
        setLink(new URL(r.path, location.origin).href);
        toast.success("Link criado. Válido por 30 dias.");
        await load();
      } else toast.error(r.error);
    } catch {
      toast.error("Não foi possível criar o link.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="integration-panel company-intake-admin">
      <h2>Ofertas enviadas pelas empresas</h2>
      <p>
        Para uma empresa nova, use Cadastrar empresa → Mandar link de cadastro
        para a empresa. As ofertas enviadas após o cadastro aparecem aqui para
        análise.
      </p>
      <details>
        <summary>Links de ofertas para empresas já cadastradas</summary>
        <div className="intake-controls">
          <label>
            Empresa
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            >
              <option value="">Selecione uma empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!company}
            busy={busy}
            onClick={() =>
              setAction({
                title: "Gerar novo link para esta empresa?",
                run: generate,
              })
            }
          >
            Gerar link de ofertas
          </Button>
          <Button variant="outline" busy={busy} onClick={() => void load()}>
            Atualizar ofertas
          </Button>
        </div>
        <p className="muted">
          Um novo link substitui o anterior da mesma empresa. Guarde o link após
          gerar; ele é exibido somente neste momento.
        </p>
        {link && (
          <div className="intake-share">
            <label>
              Link para enviar à empresa
              <input value={link} readOnly onFocus={(e) => e.target.select()} />
            </label>
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard
                  .writeText(link)
                  .then(() => toast.success("Link copiado."))
                  .catch(() =>
                    toast.error("Selecione e copie o link manualmente."),
                  );
              }}
            >
              Copiar link
            </Button>
          </div>
        )}
      </details>
      <Button variant="outline" busy={busy} onClick={() => void load()}>
        Atualizar ofertas recebidas
      </Button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <h3>Links ativos</h3>
          {!result.invites.length && <p>Nenhum link ativo.</p>}
          {result.invites.map((i) => (
            <div className="intake-row" key={i.id}>
              <span>
                {i.company} · expira{" "}
                {new Date(i.expiresAt).toLocaleDateString("pt-BR")}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setAction({
                    title: "Revogar link da empresa?",
                    run: async () => {
                      const r = await revokeOfferInvite(i);
                      if (!r.ok) toast.error(r.error);
                      else {
                        setLink("");
                        await load();
                      }
                    },
                  })
                }
              >
                Revogar
              </Button>
            </div>
          ))}
          <h3>Ofertas recebidas</h3>
          {!result.offers.length && <p>Nenhuma oferta recebida ainda.</p>}
          {result.offers.map((o) => (
            <div className="intake-row" key={o.id}>
              <span>
                <strong>{o.title}</strong>
                <br />
                {o.company} ·{" "}
                {o.opportunityId ? "Rascunho criado" : "Aguardando revisão"}
              </span>
              <Button variant="outline" onClick={() => setSelected(o)}>
                Ver oferta
              </Button>
            </div>
          ))}
        </>
      )}
      {selected && (
        <Modal
          title={selected.title}
          description={selected.company}
          onClose={() => setSelected(null)}
        >
          <div className="app-install-help">
            <p>
              {selected.contactName} · {selected.contactEmail}
            </p>
            <p>{selected.details.description}</p>
            <p>Entregas: {selected.details.deliverables}</p>
            <p>Contrapartida: {selected.details.reward}</p>
            <p>
              Prazo: {selected.details.deadline} · {selected.details.vacancies}{" "}
              vagas · {selected.details.city}
            </p>
            <p>
              {selected.details.niche} · {selected.details.network} ·{" "}
              {selected.details.mode}
            </p>
            <p>Condições: {selected.details.conditions}</p>
            {selected.details.bannerUrl && (
              <a
                href={selected.details.bannerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir banner informado
              </a>
            )}
            <CampaignMaterials details={selected.details} unlocked />
            {!selected.opportunityId && (
              <Button
                onClick={() => {
                  const offer = selected;
                  setAction({
                    title: "Criar campanha como rascunho?",
                    run: async () => {
                      const r = await convertCompanyOffer(offer);
                      if (!r.ok) toast.error(r.error);
                      else {
                        toast.success(
                          "Rascunho criado no Marketplace. Revise antes de publicar.",
                        );
                        setSelected(null);
                        await load();
                      }
                    },
                  });
                }}
              >
                Criar rascunho de campanha
              </Button>
            )}
          </div>
        </Modal>
      )}
      {action && (
        <Confirm
          title={action.title}
          description="Confirme para continuar. O histórico da operação será preservado."
          onClose={() => setAction(null)}
          onConfirm={async () => {
            try {
              await action.run();
            } finally {
              setAction(null);
            }
          }}
        />
      )}
    </section>
  );
}
