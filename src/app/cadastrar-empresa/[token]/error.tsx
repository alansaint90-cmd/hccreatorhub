"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="public-offer">
      <section className="public-offer-card">
        <h1>Não foi possível abrir o cadastro.</h1>
        <p role="alert">Verifique a conexão e tente novamente.</p>
        <button className="button primary" onClick={reset}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
