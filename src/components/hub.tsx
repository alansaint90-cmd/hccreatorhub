"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Layers, Bell, Plus, Search, ArrowUpRight, Download, RefreshCw } from "lucide-react";
import { loadWorkspace, type Workspace } from "@/lib/queries";
import { executeCommand } from "@/lib/commands";
import { canManage, canFinance, isTeam } from "@/lib/permissions";
import { companySchema, opportunitySchema } from "@/lib/validators";
import { date, downloadCsv } from "@/lib/format";
import { AuthScreen } from "./auth-screen";
import { Badge, Button, Confirm, Empty, Modal, Pagination } from "./ui";
import { RecordForm, type FormSpec, type Field } from "./record-form";
import { OpportunityCard } from "./opportunity-card";
import { Operations } from "./operations";
import { nav, subtitles, type View } from "./navigation";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { Dashboard } from "./dashboard";
import { CampaignMaterials } from "./campaign-materials";
import { CampaignImage } from "./campaign-image";

const opts = (values: string[]) => values.map((v) => ({ label: v, value: v }));
export function Hub({ configured }: { configured: boolean }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const [form, setForm] = useState<FormSpec | null>(null);
  const [detail, setDetail] = useState<Workspace["opportunities"][number] | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; description: string; run: () => Promise<void> } | null>(null);
  const [notifications, setNotifications] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const r = await loadWorkspace();
    if (r.ok) setData(r.data);
    else if (r.error === "Entre para continuar.") setData(null);
    else setError(r.error);
    setLoading(false);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
      setDark(localStorage.getItem("creator_theme") === "dark");
      const v = new URLSearchParams(location.search).get("view");
      if (nav.some((n) => n[0] === v)) setView(v as View);
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const navigate = (v: View) => {
    setView(v);
    setQuery("");
    setMode("");
    setPage(1);
    setMenu(false);
    history.replaceState(null, "", `?view=${v}`);
  };
  const mutate = async (command: string, input: unknown) => {
    const r = await executeCommand(command, input);
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    toast.success("Salvo com sucesso.");
    await refresh();
    return true;
  };
  const requestConfirm = (title: string, description: string, command: string, input: unknown) =>
    setConfirm({
      title,
      description,
      run: async () => {
        if (await mutate(command, input)) {
          setConfirm(null);
          setDetail(null);
        }
      },
    });
  const openForm = (
    title: string,
    command: string,
    fields: Field[],
    schema: z.ZodType,
    extra: Record<string, unknown> = {},
    values?: Record<string, string>,
  ) =>
    setForm({
      companyRegistration: command === "company" && !!data && ["admin", "super_admin"].includes(data.user.role),
      title,
      fields,
      schema,
      values,
      submit: (d) => mutate(command, command === "proposal" ? { ...extra, body: d } : { ...d, ...extra }),
    });
  if (loading && !data)
    return (
      <main id="main" className="loading-screen" aria-busy="true">
        <Layers size={36} />
        <p>Preparando seu espaço…</p>
      </main>
    );
  if (!data)
    return (
      <>
        {error && (
          <div className="connection-error" role="alert">
            {error}{" "}
            <Button variant="outline" onClick={refresh}>
              Tentar novamente
            </Button>
          </div>
        )}
        <AuthScreen configured={configured} onSuccess={refresh} />
      </>
    );
  const team = isTeam(data.user.role),
    manage = canManage(data.user.role),
    financeAccess = canFinance(data.user.role);
  const visibleNav = nav.filter((n) =>
    team
      ? n[0] !== "profile" && (n[0] !== "finance" || financeAccess)
      : !["companies", "creators", "finance"].includes(n[0]),
  );
  const current = visibleNav.some((n) => n[0] === view) ? view : "overview";
  const title = nav.find((n) => n[0] === current)?.[1] ?? "Visão geral";
  const opportunities = data.opportunities.filter(
    (o) =>
      (o.title + " " + o.company + " " + o.details.niche).toLowerCase().includes(query.toLowerCase()) &&
      (!mode || o.details.mode === mode),
  );
  const newCompany = () =>
    openForm(
      "Cadastrar empresa",
      "company",
      [
        { name: "name", label: "Nome da marca" },
        { name: "segment", label: "Segmento" },
        { name: "city", label: "Cidade" },
        { name: "contact", label: "Responsável / contato" },
        {
          name: "stage",
          label: "Etapa comercial",
          type: "select",
          options: opts(["Prospecção", "Contato feito", "Em negociação", "Contrato"]),
        },
      ],
      companySchema,
    );
  const newOpportunity = () => {
    if (!data.companies.length) {
      toast.info("Cadastre uma empresa para criar a primeira oportunidade.");
      navigate("companies");
      return;
    }
    openForm(
      "Nova oportunidade",
      "opportunity",
      [
        { name: "title", label: "Título da campanha" },
        {
          name: "companyId",
          label: "Marca",
          type: "select",
          options: data.companies.map((c) => ({ value: c.id, label: c.name })),
        },
        { name: "description", label: "Descrição / briefing", type: "textarea" },
        {
          name: "bannerUrl",
          label: "Banner da campanha",
          type: "banner",
          optional: true,
          help: "Recomendado: imagem horizontal de 1600 × 900 px.",
        },
        {
          name: "campaignUrl",
          label: "Link principal da campanha",
          type: "url",
          optional: true,
          help: "Visível ao creator após aceitar a parceria.",
        },
        {
          name: "supportMaterials",
          label: "Links de materiais de apoio",
          type: "textarea",
          optional: true,
          help: "Um por linha. Exemplo: Briefing | https://drive.google.com/... — liberados após o aceite.",
        },
        { name: "niche", label: "Nicho desejado" },
        { name: "city", label: "Localização" },
        {
          name: "mode",
          label: "Modalidade",
          type: "select",
          options: opts(["Remunerada", "Permuta / kit", "Híbrida"]),
        },
        {
          name: "network",
          label: "Rede social",
          type: "select",
          options: opts(["Instagram", "TikTok", "YouTube", "Multiplataforma"]),
        },
        { name: "reward", label: "Contrapartida para o creator" },
        { name: "deliverables", label: "Quantidade e tipos de materiais", type: "textarea" },
        { name: "deadline", label: "Prazo de entrega", type: "date" },
        { name: "vacancies", label: "Vagas", type: "number" },
        { name: "conditions", label: "Condições e requisitos", type: "textarea" },
        { name: "status", label: "Status", type: "select", options: opts(["Rascunho", "Publicada", "Encerrada"]) },
      ],
      opportunitySchema,
    );
  };
  const pending = data.applications.filter((a) => a.status === "Em análise").length;
  const cards = (featured = false) => {
    const rows = featured
      ? opportunities.filter((o) => o.status === "Publicada").slice(0, 3)
      : opportunities.slice((page - 1) * 15, page * 15);
    return rows.length ? (
      <div className="opportunity-grid">
        {rows.map((op) => (
          <OpportunityCard key={op.id} op={op} onOpen={() => setDetail(op)} />
        ))}
      </div>
    ) : (
      <Empty
        filtered={!!query || !!mode}
        onClear={() => {
          setQuery("");
          setMode("");
        }}
        action={
          manage ? (
            <Button onClick={newOpportunity}>
              <Plus size={16} />
              Nova campanha
            </Button>
          ) : undefined
        }
      />
    );
  };
  return (
    <div className={`app-shell ${team ? "team-workspace" : "creator-workspace"}`}>
      <AppSidebar
        menu={menu}
        team={team}
        current={current}
        pending={pending}
        visibleNav={visibleNav}
        navigate={navigate}
      />
      {menu && <button className="sidebar-overlay" aria-label="Fechar menu" onClick={() => setMenu(false)} />}
      <div className="workspace-main">
        <AppHeader
          menu={menu}
          setMenu={setMenu}
          dark={dark}
          setDark={setDark}
          title={title}
          data={data}
          team={team}
          setData={setData}
          setNotifications={setNotifications}
        />
        <main id="main" tabIndex={-1} className="content">
          {error && (
            <div className="notice error" role="alert">
              {error}
              <Button variant="outline" onClick={refresh}>
                Tentar novamente
              </Button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {current === "overview" ? "CONECTE. CRIE. CRESÇA." : "SEU PRÓXIMO PASSO COMEÇA AQUI"}
              </div>
              <h1>
                {current === "overview" ? `Olá, ${data.user.name.split(" ")[0]}` : title}
                <span className="title-dot">.</span>
              </h1>
              <p>{subtitles[current]}</p>
            </div>
            {manage && ["overview", "market"].includes(current) && (
              <Button onClick={newOpportunity}>
                <Plus size={17} />
                Nova campanha
              </Button>
            )}
            {manage && current === "companies" && (
              <Button onClick={newCompany}>
                <Plus size={17} />
                Cadastrar empresa
              </Button>
            )}
          </div>
          {loading && (
            <div className="refresh-status" role="status">
              <RefreshCw size={14} className="spin" />
              Atualizando seu espaço…
            </div>
          )}
          {current === "overview" && (
            <Dashboard data={data} team={team} pending={pending} navigate={navigate}>
              {cards(true)}
            </Dashboard>
          )}
          {current === "market" && (
            <>
              <div className="filter-bar">
                <label className="search-input">
                  <Search size={18} />
                  <input
                    aria-label="Buscar oportunidades"
                    placeholder="Busque por marca, campanha ou nicho"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <select
                  aria-label="Filtrar modalidade"
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas as modalidades</option>
                  {opts(["Remunerada", "Permuta / kit", "Híbrida"]).map((o) => (
                    <option key={o.value}>{o.value}</option>
                  ))}
                </select>
                {(query || mode) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setQuery("");
                      setMode("");
                      setPage(1);
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
                <span className="result-count">{opportunities.length} oportunidades</span>
                <Button
                  variant="outline"
                  disabled={!opportunities.length}
                  onClick={() =>
                    downloadCsv(
                      "oportunidades",
                      opportunities.map((o) => ({
                        Marca: o.company,
                        Campanha: o.title,
                        Modalidade: o.details.mode,
                        Status: o.status,
                        Prazo: date(o.details.deadline),
                      })),
                    )
                  }
                >
                  <Download size={16} />
                  CSV
                </Button>
              </div>
              {cards()}
              <Pagination page={page} total={opportunities.length} onPage={setPage} />
            </>
          )}
          {!["overview", "market"].includes(current) && (
            <Operations
              key={current}
              view={current}
              data={data}
              manage={manage}
              openForm={openForm}
              mutate={mutate}
              requestConfirm={requestConfirm}
              newCompany={newCompany}
            />
          )}
          <footer className="content-footer">
            <span>Conexões que criam possibilidades.</span>
            <span>HC Agency © {new Date().getFullYear()}</span>
          </footer>
        </main>
      </div>
      {form && <RecordForm spec={form} onClose={() => setForm(null)} />}
      {confirm && (
        <Confirm
          title={confirm.title}
          description={confirm.description}
          onConfirm={confirm.run}
          onClose={() => setConfirm(null)}
        />
      )}
      {detail && (
        <Modal
          title={detail.title}
          description={`${detail.company} · ${detail.details.city}`}
          onClose={() => setDetail(null)}
        >
          <div className="detail-content">
            {detail.details.bannerUrl && (
              <div className="campaign-detail-banner">
                <CampaignImage key={detail.details.bannerUrl} src={detail.details.bannerUrl} title={detail.title} />
              </div>
            )}
            <Badge>{detail.details.mode}</Badge>
            <p>{detail.details.description}</p>
            <h3>Escopo e entregas</h3>
            <p>{detail.details.deliverables}</p>
            <div className="detail-grid">
              <div>
                <small>PRAZO</small>
                <strong>{date(detail.details.deadline)}</strong>
              </div>
              <div>
                <small>CONTRAPARTIDA</small>
                <strong>{detail.details.reward}</strong>
              </div>
            </div>
            <h3>Requisitos e condições</h3>
            <p>{detail.details.conditions}</p>
            <CampaignMaterials details={detail.details} unlocked={team} />
            <p className="muted">A negociação e a aprovação final são realizadas pela nossa equipe.</p>
            <footer className="dialog-footer">
              {manage ? (
                ["Publicada", "Encerrada", "Rascunho"]
                  .filter((s) => s !== detail.status)
                  .map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      onClick={() =>
                        requestConfirm(
                          `Alterar para ${status.toLowerCase()}?`,
                          "Esta alteração muda a disponibilidade da oportunidade para os creators.",
                          "opportunity-status",
                          { id: detail.id, updatedAt: detail.updatedAt, status },
                        )
                      }
                    >
                      {status}
                    </Button>
                  ))
              ) : !team ? (
                data.applications.some((a) => a.opportunityId === detail.id) ? (
                  <Badge>Candidatura enviada</Badge>
                ) : (
                  <Button
                    onClick={() =>
                      requestConfirm(
                        "Enviar candidatura?",
                        "Seu perfil e as condições desta oportunidade serão registrados para avaliação da equipe.",
                        "apply",
                        { id: detail.id },
                      )
                    }
                  >
                    Me candidatar
                    <ArrowUpRight size={17} />
                  </Button>
                )
              ) : null}
            </footer>
          </div>
        </Modal>
      )}
      {notifications && (
        <Modal title="Suas atualizações" onClose={() => setNotifications(false)}>
          {data.notices.length ? (
            data.notices.map((n) => (
              <div className="activity-row" key={n.id}>
                <Bell size={16} />
                <p>{n.message}</p>
                <time>{date(n.createdAt)}</time>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </Modal>
      )}
    </div>
  );
}
