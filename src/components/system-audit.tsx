"use client";
import { useState } from "react";
import { auditSystem } from "@/lib/system-audit";
import { Button } from "./ui";
import { date } from "@/lib/format";
export function SystemAudit() {
  const [report, setReport] = useState<Awaited<
    ReturnType<typeof auditSystem>
  > | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run() {
    setBusy(true);
    setError("");
    try {
      setReport(await auditSystem());
    } catch {
      setError(
        "Não foi possível executar a auditoria. Verifique seu acesso administrativo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="integration-panel admin-audit">
      <h2>Auditoria do sistema</h2>
      <p>
        Verificação ao vivo do banco, Redis, cadastros e registros de auditoria.
        Visível somente à administração.
      </p>
      <Button onClick={() => void run()} busy={busy}>
        Verificar agora
      </Button>
      {error && <p role="alert">{error}</p>}
      {report && (
        <div className="audit-results">
          <p>
            Verificado em {new Date(report.checkedAt).toLocaleString("pt-BR")}
          </p>
          {[report.postgres, report.redis].map((item, i) => (
            <p key={i} className={item.ok ? "audit-ok" : "audit-warning"}>
              {item.ok ? "OK" : "Atenção"} — {item.message}
            </p>
          ))}
          <p>
            O PostgreSQL guarda os dados e tabelas. Redis guarda apenas chaves
            temporárias para limitar tentativas; ele não possui tabelas de
            creators ou empresas.
          </p>
          {report.registration && (
            <p>
              {report.registration.creators} creators ativos ·{" "}
              {report.registration.incompleteProfiles} perfis incompletos ·{" "}
              {report.registration.missingAudit} cadastros sem evento de
              auditoria.
            </p>
          )}
          {!!report.foreignKeys.length && (
            <p role="alert">
              Revisar exclusão nas relações: {report.foreignKeys.join(", ")}
            </p>
          )}
          <div className="audit-table-grid">
            {report.tables.map((t) => (
              <div key={t.name}>
                <strong>{t.name}</strong>
                <span>
                  {t.ok
                    ? `${t.count} registros ativos`
                    : `Ausente ou incompleta: ${t.missing.join(", ")}`}
                </span>
              </div>
            ))}
          </div>
          <details>
            <summary>Últimos registros de auditoria</summary>
            {report.recent.map((item) => (
              <p key={item.id}>
                {date(item.createdAt)} · {item.action}
              </p>
            ))}
          </details>
        </div>
      )}
    </section>
  );
}
