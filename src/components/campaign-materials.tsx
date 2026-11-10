import { ExternalLink, FolderOpen, LockKeyhole } from "lucide-react";
import type { OpportunityDetails } from "@/lib/db/schema";

export function CampaignMaterials({ details, unlocked }: { details: OpportunityDetails; unlocked: boolean }) {
  if (!unlocked)
    return (
      <div className="campaign-materials-locked">
        <LockKeyhole size={17} />
        <p>Os links e materiais ficam disponíveis em Minhas parcerias após você aceitar as condições.</p>
      </div>
    );
  const materials = details.supportMaterials ?? [];
  if (!details.campaignUrl && !materials.length) return null;
  return (
    <section className="campaign-materials">
      <h3>
        <FolderOpen size={18} />
        Links e materiais da campanha
      </h3>
      <p className="muted">Abra o briefing, as referências e os arquivos disponibilizados pela equipe.</p>
      <div>
        {details.campaignUrl && (
          <a href={details.campaignUrl} target="_blank" rel="noopener noreferrer">
            Link principal da campanha
            <ExternalLink size={15} />
          </a>
        )}
        {materials.map((material, index) => (
          <a key={`${material.url}-${index}`} href={material.url} target="_blank" rel="noopener noreferrer">
            {material.title}
            <ExternalLink size={15} />
          </a>
        ))}
      </div>
    </section>
  );
}
