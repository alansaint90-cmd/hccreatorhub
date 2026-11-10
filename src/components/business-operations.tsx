"use client";
import { useState } from "react";
import { z } from "zod";
import { Download, Plus, ExternalLink, Link2, RefreshCw } from "lucide-react";
import type { Workspace } from "@/lib/queries";
import { profileSchema, moneySchema } from "@/lib/validators";
import { date, downloadCsv, money } from "@/lib/format";
import { Button, Badge, Empty, Pagination } from "./ui";
import { RecordForm } from "./record-form";
import { useOperationFilters, type Props } from "./operation-filters";

export function BusinessOperations(props: Props) {
  const { view, data, openForm, mutate, status, page, setPage, search, paginate, filters, empty, confirm } =
    useOperationFilters(props);
  if (view === "finance") {
    const rows = data.finance.filter(
      (f) =>
        (!status || f.status === status) &&
        search(data.partnerships.find((p) => p.id === f.partnershipId)?.title ?? ""),
    );
    return (
      <>
        <div className="finance-heading">
          <p className="muted">Controle gerencial. Pagamentos e repasses são confirmados manualmente pela equipe.</p>
          <Button
            disabled={!data.partnerships.length}
            onClick={() =>
              openForm(
                "Registrar negociação",
                "finance",
                [
                  {
                    name: "id",
                    label: "Parceria",
                    type: "select",
                    options: data.partnerships.map((p) => ({ value: p.id, label: p.title })),
                  },
                  { name: "companyCents", label: "Valor da empresa", type: "money" },
                  { name: "platformCents", label: "Receita da plataforma", type: "money" },
                  { name: "creatorCents", label: "Remuneração do creator", type: "money" },
                  { name: "benefit", label: "Kit / benefício não monetário", optional: true },
                ],
                z.object({
                  id: z.uuid(),
                  companyCents: moneySchema,
                  platformCents: moneySchema,
                  creatorCents: moneySchema,
                  benefit: z.string().max(500),
                }),
              )
            }
          >
            <Plus size={16} />
            Registrar negociação
          </Button>
        </div>
        {filters("Buscar parceria", ["Pendente", "Recebido", "Repassado"])}
        <dl className="kpi-grid finance-kpis">
          {(["companyCents", "platformCents", "creatorCents"] as const).map((k, i) => (
            <div className="kpi" key={k}>
              <div>
                <dt>{["Valor das empresas", "Receita da plataforma", "Remuneração dos creators"][i]}</dt>
                <dd>{money(rows.reduce((a, f) => a + f[k], 0))}</dd>
                <small>Condições registradas no filtro</small>
              </div>
            </div>
          ))}
        </dl>
        <div className="table-panel">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>Parceria</th>
                  <th>Empresa</th>
                  <th>Plataforma</th>
                  <th>Creator</th>
                  <th>Status / ações</th>
                </tr>
              </thead>
              <tbody>
                {paginate(rows).map((f) => (
                  <tr key={f.id}>
                    <td>
                      <strong>{data.partnerships.find((p) => p.id === f.partnershipId)?.title ?? "Parceria"}</strong>
                      <small>{f.benefit}</small>
                    </td>
                    <td>{money(f.companyCents)}</td>
                    <td>{money(f.platformCents)}</td>
                    <td>{money(f.creatorCents)}</td>
                    <td>
                      <Badge>{f.status}</Badge>
                      {f.status !== "Repassado" && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            confirm(
                              f.status === "Pendente"
                                ? "Confirmar recebimento da empresa?"
                                : "Confirmar repasse ao creator?",
                              "finance-status",
                              f,
                              { status: f.status === "Pendente" ? "Recebido" : "Repassado" },
                            )
                          }
                        >
                          {f.status === "Pendente" ? "Confirmar recebimento" : "Confirmar repasse"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            empty
          )}
          <Pagination page={page} total={rows.length} onPage={setPage} />
        </div>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              "financeiro",
              rows.map((f) => ({
                Parceria: data.partnerships.find((p) => p.id === f.partnershipId)?.title ?? "",
                Empresa: (f.companyCents / 100).toFixed(2).replace(".", ","),
                Plataforma: (f.platformCents / 100).toFixed(2).replace(".", ","),
                Creator: (f.creatorCents / 100).toFixed(2).replace(".", ","),
                Benefício: f.benefit,
                Status: f.status,
              })),
            )
          }
        >
          <Download size={16} />
          Exportar CSV
        </Button>
      </>
    );
  }
  if (view === "profile")
    return (
      <div className="profile-panel">
        <span className="avatar large">{data.user.name[0]}</span>
        <h2>{data.user.name}</h2>
        <p className="muted">{data.user.email}</p>
        <div className="notice">
          As métricas são informadas por você. Informe a data de referência para manter seu perfil transparente.
        </div>
        <RecordFormInline data={data} mutate={mutate} />
      </div>
    );
  return (
    <>
      <section className="integration-panel">
        <span className="integration-icon">
          <RefreshCw size={24} />
        </span>
        <div>
          <h2>Resultados com dados reais</h2>
          <p>Vendas e comissões estarão disponíveis quando uma loja ou plataforma de afiliados for conectada.</p>
          <Badge>Nenhum provedor conectado</Badge>
          <p className="muted">Cliques não representam vendas. Nenhuma receita é estimada automaticamente.</p>
        </div>
      </section>
      <section className="activity-panel">
        <h2>Links das parcerias</h2>
        <p className="muted">
          Disponíveis após aprovação e aceite. Os links exigem acesso à plataforma e preservam os parâmetros do destino.
        </p>
        {data.links.length ? (
          data.links.map((l) => (
            <div className="activity-row" key={l.id}>
              <Link2 size={18} />
              <a className="text-link" href={`/go/${l.id}`} target="_blank" rel="noopener">
                {data.partnerships.find((p) => p.id === l.partnershipId)?.title ?? "Abrir link da parceria"}
                <ExternalLink size={14} />
              </a>
            </div>
          ))
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}

function RecordFormInline({ data, mutate }: { data: Workspace; mutate: Props["mutate"] }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className="profile-details">
        {[
          ["Cidade", data.user.profile.city],
          ["Nicho", data.user.profile.niche],
          ["Instagram", data.user.profile.instagram],
          ["Seguidores", data.user.profile.followers],
          ["Engajamento", data.user.profile.engagement],
          ["Referência", data.user.profile.metricsDate ? date(data.user.profile.metricsDate) : ""],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value || "Não informado"}</strong>
          </div>
        ))}
      </div>
      <Button onClick={() => setEditing(true)}>Editar meu perfil</Button>
      {editing && (
        <RecordForm
          onClose={() => setEditing(false)}
          spec={{
            title: "Editar meu perfil",
            schema: profileSchema,
            values: data.user.profile,
            fields: [
              { name: "bio", label: "Sobre você", type: "textarea", optional: true },
              { name: "photoUrl", label: "Foto do perfil (URL HTTPS)", type: "url", optional: true },
              { name: "city", label: "Cidade" },
              { name: "niche", label: "Nicho principal" },
              { name: "instagram", label: "Instagram" },
              { name: "followers", label: "Seguidores", type: "number" },
              { name: "engagement", label: "Engajamento (%)" },
              { name: "metricsDate", label: "Data de referência", type: "date" },
              { name: "portfolio", label: "Portfólio (HTTPS)", type: "url", optional: true },
              {
                name: "portfolioImages",
                label: "Imagens do portfólio",
                type: "textarea",
                optional: true,
                help: "Até 8 URLs HTTPS de imagens, uma por linha.",
              },
              {
                name: "mediaLinks",
                label: "Vídeos e materiais",
                type: "textarea",
                optional: true,
                help: "Um link por linha. Ex.: Apresentação | https://...",
              },
            ],
            submit: (d) => mutate("profile", { profile: d, updatedAt: data.user.updatedAt }),
          }}
        />
      )}
    </>
  );
}
