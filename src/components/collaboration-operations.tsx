"use client";
import { z } from "zod";
import { Download, Plus, ExternalLink, FileText, Link2, Check } from "lucide-react";
import { proposalBody, httpsUrl } from "@/lib/validators";
import { date } from "@/lib/format";
import { Button, Badge, Modal, Pagination } from "./ui";
import { useOperationFilters, type Props } from "./operation-filters";
import { CampaignMaterials } from "./campaign-materials";

export function CollaborationOperations(props: Props) {
  const {
    view,
    data,
    manage,
    openForm,
    status,
    page,
    setPage,
    proposal,
    setProposal,
    search,
    paginate,
    filters,
    empty,
    confirm,
  } = useOperationFilters(props);
  if (view === "applications") {
    const rows = data.applications.filter((a) => search(a.title + " " + a.creator) && (!status || a.status === status));
    return (
      <>
        {filters("Buscar campanha ou creator", ["Em análise", "Aprovado", "Reprovado"])}
        <div className="table-panel">
          {rows.length ? (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Campanha</th>
                    <th>Creator</th>
                    <th>Status</th>
                    <th>Acompanhamento</th>
                  </tr>
                </thead>
                <tbody>
                  {paginate(rows).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.title}</strong>
                      </td>
                      <td>{a.creator}</td>
                      <td>
                        <Badge>{a.status}</Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          {manage && (
                            <Button
                              variant="ghost"
                              onClick={() => setProposal(data.proposals.find((p) => p.applicationId === a.id) ?? null)}
                            >
                              <FileText size={15} />
                              Proposta
                            </Button>
                          )}
                          {manage && a.status === "Em análise" ? (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => confirm("Aprovar candidatura?", "decision", a, { status: "Aprovado" })}
                              >
                                Aprovar
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => confirm("Reprovar candidatura?", "decision", a, { status: "Reprovado" })}
                              >
                                Reprovar
                              </Button>
                            </>
                          ) : !manage ? (
                            <small className="muted">Avaliação pela equipe</small>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} total={rows.length} onPage={setPage} />
            </>
          ) : (
            empty
          )}
        </div>
        {proposal && (
          <Modal title={`Proposta comercial · versão ${proposal.version}`} onClose={() => setProposal(null)}>
            <div className="print-sheet">
              <span className="eyebrow">HC AGENCY · PROPOSTA COMERCIAL</span>
              <h2>{proposal.body.campaign}</h2>
              <p>
                Creator: <strong>{proposal.body.creator}</strong>
              </p>
              <h3>Escopo e entregas</h3>
              <p>{proposal.body.scope}</p>
              <h3>Contrapartida</h3>
              <p>{proposal.body.reward}</p>
              <p>Prazo: {date(proposal.body.deadline)}</p>
            </div>
            <footer className="dialog-footer">
              <Button variant="outline" onClick={() => window.print()}>
                <Download size={16} />
                Salvar como PDF
              </Button>
              <Button
                onClick={() => {
                  setProposal(null);
                  openForm(
                    "Editar proposta comercial",
                    "proposal",
                    [
                      { name: "creator", label: "Creator" },
                      { name: "campaign", label: "Campanha" },
                      { name: "scope", label: "Escopo e entregas", type: "textarea" },
                      { name: "reward", label: "Contrapartida" },
                      { name: "deadline", label: "Prazo", type: "date" },
                    ],
                    proposalBody,
                    { id: proposal.applicationId, version: proposal.version, body: undefined },
                    proposal.body,
                  );
                }}
              >
                Editar versão
              </Button>
            </footer>
          </Modal>
        )}
      </>
    );
  }
  if (view === "partnerships") {
    const rows = data.partnerships.filter((p) => search(p.title + " " + p.creator) && (!status || p.status === status));
    return (
      <>
        {filters("Buscar parceria ou creator", ["Aguardando aceite", "Em produção", "Concluída"])}
        {rows.length
          ? paginate(rows).map((p) => (
              <article className="partnership-panel" key={p.id}>
                <header>
                  <div>
                    <span className="eyebrow">{p.creator}</span>
                    <h2>{p.title}</h2>
                  </div>
                  <Badge>{p.status}</Badge>
                </header>
                <p>{p.brief.description}</p>
                <div className="brief-grid">
                  <div>
                    <small>ENTREGAS ESPERADAS</small>
                    <strong>{p.brief.deliverables}</strong>
                  </div>
                  <div>
                    <small>PRAZO</small>
                    <strong>{date(p.brief.deadline)}</strong>
                  </div>
                  <div>
                    <small>CONTRAPARTIDA</small>
                    <strong>{p.brief.reward}</strong>
                  </div>
                </div>
                <p className="muted">Condições: {p.brief.conditions}</p>
                <CampaignMaterials details={p.brief} unlocked={data.user.role !== "creator" || p.accepted} />
                <div className="row-actions">
                  {data.user.role === "creator" && !p.accepted && (
                    <Button onClick={() => confirm("Aceitar condições da parceria?", "accept", p)}>
                      Aceitar e iniciar
                      <Check size={16} />
                    </Button>
                  )}
                  {data.user.role === "creator" && p.status === "Em produção" && (
                    <Button
                      onClick={() =>
                        openForm(
                          "Registrar material",
                          "delivery",
                          [
                            { name: "url", label: "Link HTTPS do material", type: "url" },
                            { name: "note", label: "Observações", type: "textarea", optional: true },
                          ],
                          z.object({ url: httpsUrl, note: z.string().max(2000) }),
                          { id: p.id },
                        )
                      }
                    >
                      <Plus size={16} />
                      Enviar material
                    </Button>
                  )}
                  {manage && p.status === "Em produção" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() =>
                          openForm(
                            "Criar link da parceria",
                            "link",
                            [{ name: "url", label: "Destino HTTPS", type: "url" }],
                            z.object({ url: httpsUrl }),
                            { id: p.id },
                          )
                        }
                      >
                        <Link2 size={16} />
                        Criar link
                      </Button>
                      <Button variant="outline" onClick={() => confirm("Concluir parceria?", "complete", p)}>
                        Concluir parceria
                      </Button>
                    </>
                  )}
                </div>
                <div className="deliveries">
                  <h3>Materiais e publicações</h3>
                  {data.deliveries
                    .filter((d) => d.partnershipId === p.id)
                    .map((d) => (
                      <div className="delivery-row" key={d.id}>
                        <div>
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-link">
                            Abrir material
                            <ExternalLink size={14} />
                          </a>
                          <p>{d.note}</p>
                        </div>
                        <Badge>{d.status}</Badge>
                        {manage && p.status === "Em produção" && (
                          <div className="row-actions">
                            <Button
                              variant="ghost"
                              onClick={() => confirm("Aprovar material?", "review", d, { status: "Aprovado" })}
                            >
                              Aprovar
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => confirm("Solicitar ajuste?", "review", d, { status: "Ajuste solicitado" })}
                            >
                              Pedir ajuste
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  {!data.deliveries.some((d) => d.partnershipId === p.id) && (
                    <p className="muted">
                      Os materiais enviados aparecerão aqui. Nesta fase, as entregas são registradas por links.
                    </p>
                  )}
                </div>
              </article>
            ))
          : empty}
        <Pagination page={page} total={rows.length} onPage={setPage} />
      </>
    );
  }
  return null;
}
