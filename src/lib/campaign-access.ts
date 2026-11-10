import type { OpportunityDetails } from "./db/schema";

export function campaignDetailsForViewer(details: OpportunityDetails, canReadMaterials: boolean): OpportunityDetails {
  if (canReadMaterials) return details;
  const { campaignUrl: _campaignUrl, supportMaterials: _supportMaterials, ...publicDetails } = details;
  void _campaignUrl;
  void _supportMaterials;
  return publicDetails;
}
