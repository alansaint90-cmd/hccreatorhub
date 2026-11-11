import { PublicCompanyRegistration } from "@/components/public-company-registration";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Cadastre sua empresa — HC Agency",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function CompanyRegistrationPage() {
  return <PublicCompanyRegistration />;
}
