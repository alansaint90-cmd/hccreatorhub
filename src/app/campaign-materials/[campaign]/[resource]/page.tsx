import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { partnerships } from "@/lib/db/schema";
import { demoCampaigns, type DemoCampaignKey } from "@/lib/demo-campaigns";

export default async function CampaignMaterial({
  params,
}: {
  params: Promise<{ campaign: string; resource: string }>;
}) {
  const { campaign, resource } = await params;
  if (!Object.hasOwn(demoCampaigns, campaign) || !["briefing", "referencias"].includes(resource)) notFound();
  const session = await getSession();
  if (!session) redirect("/");
  const path = `/campaign-materials/${campaign}/${resource}`;
  if (session.user.role === "creator") {
    const owned = await getDb()
      .select({ brief: partnerships.brief })
      .from(partnerships)
      .where(
        and(
          eq(partnerships.creatorId, session.user.id),
          eq(partnerships.accepted, true),
          eq(partnerships.isDeleted, false),
        ),
      );
    if (!owned.some((p) => p.brief.campaignUrl === path || p.brief.supportMaterials?.some((m) => m.url === path)))
      notFound();
  }
  const material = demoCampaigns[campaign as DemoCampaignKey];
  return (
    <main id="main" className="demo-material-page">
      <Link href="/?view=partnerships" className="text-link">
        ← Voltar às parcerias
      </Link>
      <div className="notice">Material fictício de demonstração · HC Agency</div>
      <h1>{material.brand}</h1>
      <h2>{resource === "briefing" ? "Briefing da campanha" : "Referências visuais da campanha"}</h2>
      <p>{material.description}</p>
      <div className="demo-material-image">
        <Image
          src={`/images/campaigns/${campaign}.webp`}
          alt={`Referência visual de ${material.brand}`}
          fill
          unoptimized
        />
      </div>
      {resource === "briefing" ? (
        <>
          <h3>Entregas previstas</h3>
          <p>{material.deliverables}</p>
          <h3>Orientações de conteúdo</h3>
          <ul>
            {material.guidance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h3>Direção visual</h3>
          <p>
            Utilize a imagem acima como referência de segmento e composição. Imagem ilustrativa gerada para esta
            demonstração; não representa uma empresa ou oferta real.
          </p>
        </>
      )}
    </main>
  );
}
