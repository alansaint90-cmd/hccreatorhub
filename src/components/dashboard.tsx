"use client";
import {
  Layers,
  Compass,
  Building2,
  ClipboardList,
  Handshake,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import { type Workspace } from "@/lib/queries";
import { date } from "@/lib/format";
import { Button } from "./ui";
import type { View } from "./navigation";
import { AdminBanner } from "./admin-banner";

export function Dashboard({
  data,
  team,
  pending,
  navigate,
  children,
}: {
  data: Workspace;
  team: boolean;
  pending: number;
  navigate: (v: View) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {!team && (!data.user.profile.city || !data.user.profile.niche) && (
        <section className="integration-panel creator-onboarding">
          <h2>Vamos completar seu perfil?</h2>
          <p>
            Informe seus dados, nicho, cidade e portfólio para a equipe conhecer
            seu trabalho e avaliar suas candidaturas.
          </p>
          <Button onClick={() => navigate("profile")}>
            Completar meu perfil
            <ArrowRight size={16} />
          </Button>
        </section>
      )}
      {team ? (
        <AdminBanner onManage={() => navigate("market")} />
      ) : (
        <section className="hero-banner hero-banner-photo">
          <div>
            <div className="hero-pill">
              <span />
              HC AGENCY / CONECTANDO O PRÓXIMO
            </div>
            <h2>
              Sua próxima grande
              <br />
              conexão começa aqui.
            </h2>
            <p>
              Talentos, marcas e ideias. Tudo no mesmo lugar
              <br className="desktop-break" /> para transformar possibilidades
              em projetos reais.
            </p>
            <Button onClick={() => navigate("market")}>
              Explorar oportunidades
              <ArrowUpRight size={17} />
            </Button>
          </div>
        </section>
      )}
      <dl className="kpi-grid">
        {[
          [
            data.opportunities.filter((o) => o.status === "Publicada").length,
            "Oportunidades abertas",
            Compass,
            "market",
          ],
          [pending, "Candidaturas em análise", ClipboardList, "applications"],
          [
            data.partnerships.filter((p) => p.status !== "Concluída").length,
            "Parcerias em andamento",
            Handshake,
            "partnerships",
          ],
          [
            team ? data.companies.length : data.deliveries.length,
            team ? "Marcas conectadas" : "Materiais enviados",
            team ? Building2 : Layers,
            team ? "companies" : "partnerships",
          ],
        ].map(([n, label, Icon, target]) => {
          const I = Icon as typeof Compass;
          return (
            <div className="kpi" key={String(label)}>
              <div>
                <dt>{String(label)}</dt>
                <dd>{String(n)}</dd>
                <button onClick={() => navigate(target as View)}>
                  Acompanhar
                  <ArrowRight size={12} />
                </button>
              </div>
              <span className="kpi-icon">
                <I size={21} />
              </span>
            </div>
          );
        })}
      </dl>
      <div className="section-heading">
        <div>
          <h2>Oportunidades em destaque</h2>
          <p>Novas conexões esperando para acontecer.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("market")}>
          Ver todas
          <ArrowRight size={16} />
        </Button>
      </div>
      {children}
      <section className="activity-panel">
        <div className="section-heading">
          <h2>Últimas atualizações</h2>
          <span className="tiny-label">NA SUA REDE</span>
        </div>
        {data.notices.length ? (
          data.notices.slice(0, 4).map((n) => (
            <div className="activity-row" key={n.id}>
              <span className="activity-dot" />
              <p>{n.message}</p>
              <time>{date(n.createdAt)}</time>
            </div>
          ))
        ) : (
          <p className="muted">
            Seu histórico começa com a primeira conexão. As novidades aparecerão
            aqui.
          </p>
        )}
      </section>
    </>
  );
}
