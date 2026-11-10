import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignDetailsForViewer } from "../src/lib/campaign-access";
import { bannerUrlSchema, supportMaterialsSchema, opportunitySchema, profileSchema } from "../src/lib/validators";
import type { OpportunityDetails } from "../src/lib/db/schema";
const details: OpportunityDetails = {
  description: "Campanha de teste",
  niche: "Beleza",
  city: "Brasil",
  mode: "Remunerada",
  reward: "A combinar",
  deliverables: "Um vídeo",
  deadline: "2026-11-30",
  vacancies: 1,
  conditions: "Condições de teste",
  network: "Instagram",
  bannerUrl: "/images/campaigns/brand-experience.webp",
  campaignUrl: "https://example.com/campanha",
  supportMaterials: [{ title: "Briefing privado", url: "https://example.com/briefing?ref=a%2Fb" }],
};
test("materiais não são serializados para creators antes do aceite", () => {
  const visible = campaignDetailsForViewer(details, false);
  assert.equal("campaignUrl" in visible, false);
  assert.equal("supportMaterials" in visible, false);
  assert.equal(visible.bannerUrl, details.bannerUrl);
  assert.equal(details.supportMaterials?.length, 1);
  assert.deepEqual(campaignDetailsForViewer(details, true), details);
  assert.equal(
    campaignDetailsForViewer(details, true).supportMaterials?.[0].url,
    "https://example.com/briefing?ref=a%2Fb",
  );
});
test("links de apoio aceitam título e URL por linha e recusam destinos inseguros", () => {
  const links = supportMaterialsSchema.parse("Briefing | https://example.com/briefing\nhttps://example.com/video");
  assert.deepEqual(links, [
    { title: "Briefing", url: "https://example.com/briefing" },
    { title: "Material de apoio", url: "https://example.com/video" },
  ]);
  assert.equal(supportMaterialsSchema.safeParse("javascript:alert(1)").success, false);
  assert.equal(supportMaterialsSchema.safeParse("https://127.0.0.1/arquivo").success, false);
  assert.equal(
    supportMaterialsSchema.safeParse(
      Array.from({ length: 21 }, () => ({ title: "Material", url: "https://example.com" })),
    ).success,
    false,
  );
});
test("banners aceitam endereços permitidos e campanhas antigas continuam válidas", () => {
  assert.equal(bannerUrlSchema.safeParse("/images/campaigns/leve-lava.webp").success, true);
  assert.equal(bannerUrlSchema.safeParse("/../../arquivo").success, false);
  assert.equal(bannerUrlSchema.safeParse("data:image/svg+xml,<svg/>").success, false);
  const campaign = opportunitySchema.parse({
    ...details,
    companyId: "123e4567-e89b-42d3-a456-426614174000",
    title: "Campanha",
    status: "Publicada",
    bannerUrl: undefined,
    supportMaterials: undefined,
    campaignUrl: undefined,
  });
  assert.equal(campaign.bannerUrl, "");
  assert.deepEqual(campaign.supportMaterials, []);
});
test("galeria de creators valida quantidade e esquema das imagens", () => {
  const profile = {
    city: "São Paulo",
    niche: "Beleza",
    instagram: "@creator",
    followers: "1200",
    engagement: "4,2",
    metricsDate: "2026-10-30",
    portfolio: "",
  };
  assert.equal(profileSchema.safeParse({ ...profile, portfolioImages: "https://example.com/foto.jpg" }).success, true);
  assert.equal(profileSchema.safeParse({ ...profile, portfolioImages: "javascript:alert(1)" }).success, false);
  assert.equal(
    profileSchema.safeParse({ ...profile, portfolioImages: Array(9).fill("https://example.com/foto.jpg").join("\n") })
      .success,
    false,
  );
});
