import { Brand } from "@/components/brand";
export default function InviteUnavailable() {
  return (
    <main id="main" className="public-offer">
      <header>
        <Brand />
      </header>
      <section className="public-offer-card">
        <h1>Este link não está disponível.</h1>
        <p>
          Ele pode ter expirado ou sido revogado pela equipe. Solicite um novo
          link de ofertas à HC Agency.
        </p>
      </section>
    </main>
  );
}
