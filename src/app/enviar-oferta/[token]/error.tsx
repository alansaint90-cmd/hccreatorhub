"use client";
import { Button } from "@/components/ui";
export default function OfferError({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="public-offer">
      <section className="public-offer-card" role="alert">
        <h1>Não foi possível abrir o formulário.</h1>
        <p>
          Confira sua conexão e tente novamente. Se o problema continuar, fale
          com a equipe da HC Agency.
        </p>
        <Button onClick={reset}>Tentar novamente</Button>
      </section>
    </main>
  );
}
