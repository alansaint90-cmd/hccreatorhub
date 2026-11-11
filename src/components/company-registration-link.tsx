"use client";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "./ui";
const subscribe = () => () => {};
export function CompanyRegistrationLink() {
  const origin = useSyncExternalStore(subscribe, () => location.origin, () => "");
  const link = `${origin}/cadastrar-empresa`;
  return (
    <section className="company-registration-choice">
      <h3>Link de cadastro da empresa</h3>
      <p>
        Copie este link e envie para qualquer empresa. Ela preenche os próprios
        dados e o cadastro aparece na lista de Empresas, como um cadastro feito
        pela equipe.
      </p>
      <div className="intake-share">
        <label>
          Link fixo para enviar à empresa
          <input value={link} readOnly onFocus={(e) => e.target.select()} />
        </label>
        <Button
          variant="outline"
          onClick={() =>
            void navigator.clipboard
              .writeText(link)
              .then(() => toast.success("Link de cadastro copiado."))
              .catch(() => toast.error("Selecione e copie o link manualmente."))
          }
        >
          Copiar link de cadastro
        </Button>
        <a href={link} target="_blank" rel="noopener noreferrer">
          Abrir formulário
        </a>
        <small>
          O mesmo link serve para todas as empresas. Depois do cadastro, elas
          podem enviar uma oferta ou falar com a equipe pelo WhatsApp.
        </small>
      </div>
      <h3>Ou cadastrar empresa manualmente</h3>
    </section>
  );
}
