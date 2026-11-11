"use client";
import { useState } from "react";
import { toast } from "sonner";
import { createCompanyRegistrationInvite } from "@/lib/company-registration-actions";
import { Button } from "./ui";

export function CompanyRegistrationLink() {
  const [link, setLink] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="company-registration-choice">
      <h3>A própria empresa pode preencher</h3>
      <p>
        Gere um link para uma nova empresa cadastrar seus dados. Ao terminar,
        ela pode cadastrar uma oferta ou conversar com a equipe pelo WhatsApp.
      </p>
      <Button
        variant="outline"
        busy={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await createCompanyRegistrationInvite();
            if (r.ok) {
              setLink(new URL(r.path, location.origin).href);
              toast.success("Link de cadastro criado.");
            } else toast.error(r.error);
          } catch {
            toast.error("Não foi possível gerar o link. Tente novamente.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Mandar link de cadastro para a empresa
      </Button>
      {link && (
        <div className="intake-share">
          <label>
            Link de cadastro da empresa
            <input value={link} readOnly onFocus={(e) => e.target.select()} />
          </label>
          <Button
            variant="outline"
            onClick={() =>
              void navigator.clipboard
                .writeText(link)
                .then(() => toast.success("Link copiado."))
                .catch(() =>
                  toast.error("Selecione e copie o link manualmente."),
                )
            }
          >
            Copiar link
          </Button>
          <a href={link} target="_blank" rel="noopener noreferrer">
            Abrir formulário
          </a>
          <small>
            Válido por 30 dias e para um cadastro. Gere um link diferente para
            cada empresa.
          </small>
        </div>
      )}
      <h3>Ou cadastrar empresa manualmente</h3>
    </section>
  );
}
