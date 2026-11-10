"use client";
import { z } from "zod";
import { Building2, Download, Archive } from "lucide-react";
import { downloadCsv } from "@/lib/format";
import { Button, Badge, Empty, Pagination } from "./ui";
import { useOperationFilters, type Props } from "./operation-filters";
import { CreatorDirectory } from "./creator-directory";

const stageOptions = ["Prospecção", "Contato feito", "Em negociação", "Contrato"].map((v) => ({ label: v, value: v }));
export function CommunityOperations(props: Props) {
  const {
    view,
    data,
    manage,
    openForm,
    newCompany,
    query,
    status,
    page,
    setPage,
    setQuery,
    setStatus,
    search,
    paginate,
    filters,
    confirm,
  } = useOperationFilters(props);
  if (view === "companies") {
    const rows = data.companies.filter(
      (c) => search(c.name + " " + c.segment + " " + c.contact) && (!status || c.stage === status),
    );
    return (
      <>
        {filters(
          "Buscar empresa, segmento ou responsável",
          stageOptions.map((o) => o.value),
        )}
        <div className="table-panel">
          {rows.length ? (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Segmento</th>
                    <th>Responsável</th>
                    <th>Etapa comercial</th>
                    {manage && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginate(rows).map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="table-brand">
                          <span className="company-avatar">
                            <Building2 size={18} />
                          </span>
                          <div>
                            <strong>{c.name}</strong>
                            <small>{c.city}</small>
                          </div>
                        </div>
                      </td>
                      <td>{c.segment}</td>
                      <td>{c.contact}</td>
                      <td>
                        <Badge>{c.stage}</Badge>
                      </td>
                      {manage && (
                        <td>
                          <div className="row-actions">
                            <Button
                              variant="ghost"
                              onClick={() =>
                                openForm(
                                  "Atualizar etapa comercial",
                                  "company-stage",
                                  [{ name: "stage", label: "Etapa", type: "select", options: stageOptions }],
                                  z.object({
                                    stage: z.enum(["Prospecção", "Contato feito", "Em negociação", "Contrato"]),
                                  }),
                                  { id: c.id, updatedAt: c.updatedAt },
                                  { stage: c.stage },
                                )
                              }
                            >
                              Atualizar
                            </Button>
                            <Button
                              variant="ghost"
                              aria-label={`Arquivar ${c.name}`}
                              onClick={() => confirm("Arquivar empresa?", "archive-company", c)}
                            >
                              <Archive size={16} />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} total={rows.length} onPage={setPage} />
            </>
          ) : (
            <Empty
              filtered={!!query || !!status}
              onClear={() => {
                setQuery("");
                setStatus("");
              }}
              action={manage ? <Button onClick={newCompany}>Cadastrar primeira empresa</Button> : undefined}
            />
          )}
        </div>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              "empresas",
              rows.map((c) => ({
                Empresa: c.name,
                Cidade: c.city,
                Segmento: c.segment,
                Responsável: c.contact,
                Etapa: c.stage,
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
  if (view === "creators") return <CreatorDirectory creators={data.creators} />;
  return null;
}
