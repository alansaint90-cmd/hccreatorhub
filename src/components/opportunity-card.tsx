"use client";
import { ArrowUpRight, MapPin, CalendarDays, Users, Camera } from "lucide-react";
import type { Workspace } from "@/lib/queries";
import { date } from "@/lib/format";
import { Badge, Button } from "./ui";
import { CampaignImage } from "./campaign-image";
export function OpportunityCard({ op, onOpen }: { op: Workspace["opportunities"][number]; onOpen: () => void }) {
  const d = op.details;
  return (
    <article className="opportunity-card">
      <div
        className={`campaign-cover ${d.bannerUrl ? "has-banner" : ""} ${d.mode === "Permuta / kit" ? "cover-peach" : d.mode === "Híbrida" ? "cover-mint" : ""}`}
      >
        {d.bannerUrl && <CampaignImage key={d.bannerUrl} src={d.bannerUrl} title={`Banner de ${op.title}`} />}
        <div className="cover-top">
          <Badge>{d.mode}</Badge>
          {d.isDemo&&<Badge>Demonstração</Badge>}
          <span className="cover-status">{op.status}</span>
        </div>
        {!d.bannerUrl && (
          <>
            <div className="campaign-monogram" aria-hidden="true">
              {op.company.slice(0, 1)}
            </div>
            <span className="campaign-brand">{op.company}</span>
            <div className="cover-rings" aria-hidden="true" />
          </>
        )}
      </div>
      <div className="opportunity-body">
        <div className="brand-line">
          {op.company}
          <span>
            <MapPin size={12} />
            {d.city}
          </span>
        </div>
        <h3>{op.title}</h3>
        <p>{d.description}</p>
        <div className="chips">
          <span>{d.niche}</span>
          <span>
            <Camera size={12} />
            {d.network}
          </span>
        </div>
        <div className="campaign-meta">
          <span>
            <CalendarDays size={14} />
            {date(d.deadline)}
          </span>
          <span>
            <Users size={14} />
            {d.vacancies} {d.vacancies === 1 ? "vaga" : "vagas"}
          </span>
        </div>
        <footer>
          <div>
            <small>CONTRAPARTIDA</small>
            <strong>{d.reward}</strong>
          </div>
          <Button variant="ghost" aria-label={`Ver oportunidade ${op.title}`} onClick={onOpen}>
            <ArrowUpRight size={20} />
          </Button>
        </footer>
      </div>
    </article>
  );
}
