import { notFound } from "next/navigation";
import { companyRegistrationContext } from "@/lib/company-registration-actions";
import { PublicCompanyRegistration } from "@/components/public-company-registration";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Cadastre sua empresa — HC Agency",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function CompanyRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await companyRegistrationContext(token))) notFound();
  return <PublicCompanyRegistration token={token} />;
}
