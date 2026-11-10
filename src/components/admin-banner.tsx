"use client";
import { ArrowUpRight } from "lucide-react";
import { Button } from "./ui";

export function AdminBanner({ onManage }: { onManage: () => void }) {
  return (
    <section
      className="admin-hero"
      aria-label="Painel administrativo da HC Agency"
    >
      <div className="admin-hero-mobile">
        <svg
          className="admin-hero-watermark"
          viewBox="0 0 40 40"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="20" cy="20" r="19" />
          <path fill="var(--carbon)" d="M11 10h6v20h-6zM28 10a10 10 0 0 0 0 20V10Z" />
        </svg>
        <div className="admin-hero-mobile-art" aria-hidden="true" />
        <div className="admin-hero-mobile-copy">
          <span>HC AGENCY / PAINEL ADMINISTRATIVO</span>
          <h2>
            Grandes conexões.
            <br />
            Gestão em suas mãos.
          </h2>
          <p>Gerencie creators, marcas e campanhas em um só lugar.</p>
          <Button onClick={onManage}>
            Gerenciar campanhas
            <ArrowUpRight size={17} />
          </Button>
        </div>
      </div>
    </section>
  );
}
