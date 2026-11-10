import { notFound } from "next/navigation";
import { offerFormContext } from "@/lib/offer-actions";
import { PublicOfferForm } from "@/components/public-offer-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Envie sua oferta — HC Agency",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function OfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const company = await offerFormContext(token);
  if (!company) notFound();
  return <PublicOfferForm token={token} company={company.name} />;
}
