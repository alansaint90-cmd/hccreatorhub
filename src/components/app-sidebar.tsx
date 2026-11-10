"use client";
import { Settings2, ArrowRight, Sparkles } from "lucide-react";
import { nav, type View } from "./navigation";
import { Brand } from "./brand";

export function AppSidebar({
  menu,
  team,
  current,
  pending,
  visibleNav,
  navigate,
}: {
  menu: boolean;
  team: boolean;
  current: View;
  pending: number;
  visibleNav: ReadonlyArray<(typeof nav)[number]>;
  navigate: (v: View) => void;
}) {
  return (
    <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
      <Brand />
      <div className="workspace-label">
        <span className="workspace-dot" />
        {team ? "Gestão & parcerias" : "Creator Studio"}
        <span className="workspace-plan">WORKSPACE</span>
      </div>
      <span className="nav-caption">SEU ESPAÇO</span>
      <nav aria-label="Menu principal">
        {visibleNav
          .filter((n) => n[0] !== "settings")
          .map(([v, t, Icon]) => (
            <button
              key={v}
              className={current === v ? "active" : ""}
              onClick={() => navigate(v)}
              aria-current={current === v ? "page" : undefined}
            >
              <Icon size={19} />
              <span>
                {!team && v === "applications"
                  ? "Minhas candidaturas"
                  : !team && v === "partnerships"
                    ? "Minhas parcerias"
                    : t}
              </span>
              {v === "applications" && pending > 0 && <b>{pending}</b>}
            </button>
          ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <Sparkles size={21} />
          <h3>O próximo movimento é seu.</h3>
          <p>Conecte talento e marcas. Crie o que vem a seguir.</p>
          <button onClick={() => navigate("market")}>
            Explore o marketplace
            <ArrowRight size={15} />
          </button>
        </div>
        <button
          className={`settings-link ${current === "settings" ? "active" : ""}`}
          onClick={() => navigate("settings")}
        >
          <Settings2 size={19} />
          Integrações
        </button>
        <span className="sidebar-foot">
          HC AGENCY <span>•</span> NEXT IS NOW
        </span>
      </div>
    </aside>
  );
}
