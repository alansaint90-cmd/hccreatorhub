import type { Metadata, Viewport } from "next";
import { InstallApp } from "@/components/install-app";
import { Toaster } from "sonner";
import "./globals.css";
import "./shell.css";
import "./hero.css";
import "./campaigns.css";
import "./operations.css";
import "./dialogs.css";
import "./auth.css";
import "./responsive.css";
import "./mobile.css";
import "./hs-agency.css";
import "./hero-photo.css";
import "./campaign-media.css";
import "./creator-directory.css";
import "./admin-banner.css";
import "./auth-photo.css";
import "./brand-refresh.css";
import "./install.css";
import "./company-offers.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101010",
};
export const metadata: Metadata = {
  title: "HC Agency — Creator Platform",
  applicationName: "HC Agency",
  appleWebApp: { capable: true, title: "HC Agency", statusBarStyle: "default" },
  icons: { icon: "/icons/app-192.png", apple: "/icons/apple-touch-icon.png" },
  description:
    "A próxima grande conexão entre creators e marcas começa aqui. HC Agency Creator Platform.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <a href="#main" className="skip-link">
          Pular para o conteúdo principal
        </a>
        <InstallApp />
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
