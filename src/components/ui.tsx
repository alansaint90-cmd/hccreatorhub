"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Inbox, SearchX, X, LoaderCircle, ArrowLeft, ArrowRight } from "lucide-react";
export function Button({
  children,
  variant = "primary",
  busy = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  busy?: boolean;
}) {
  return (
    <button {...props} className={`button ${variant} ${props.className ?? ""}`} disabled={busy || props.disabled}>
      {busy && <LoaderCircle className="spin" size={16} />}
      {children}
    </button>
  );
}
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={`badge ${/Aprovado|Publicada|Concluída|Repassado|Contrato/.test(String(children)) ? "positive" : /Reprovado|Encerrada|Ajuste/.test(String(children)) ? "negative" : ""}`}
    >
      {children}
    </span>
  );
}
export function Empty({
  filtered = false,
  onClear,
  action,
}: {
  filtered?: boolean;
  onClear?: () => void;
  action?: React.ReactNode;
}) {
  const Icon = filtered ? SearchX : Inbox;
  return (
    <div className="empty" role="status">
      <span className="empty-icon">
        <Icon size={28} />
      </span>
      <h3>{filtered ? "Nenhum resultado encontrado" : "Tudo pronto para começar"}</h3>
      <p>
        {filtered
          ? "Tente outra busca ou remova os filtros."
          : "Os registros aparecerão aqui assim que sua operação começar."}
      </p>
      {filtered ? (
        <Button variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : (
        action
      )}
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
    >
      <header className="dialog-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <Button variant="ghost" aria-label="Fechar janela" onClick={onClose}>
          <X size={20} />
        </Button>
      </header>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(3);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>{description}</p>
      <footer className="dialog-footer">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Voltar
        </Button>
        <Button
          variant="danger"
          disabled={seconds > 0}
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {seconds ? `Aguarde ${seconds}s` : "Confirmar"}
        </Button>
      </footer>
    </Modal>
  );
}
export function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / 15));
  return (
    <footer className="pagination">
      <span>
        {total ? `Mostrando ${(page - 1) * 15 + 1} a ${Math.min(page * 15, total)} de ${total}` : "Nenhum registro"}
      </span>
      <div>
        <Button variant="outline" aria-label="Página anterior" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ArrowLeft size={16} />
        </Button>
        <span>
          {page} / {pages}
        </span>
        <Button variant="outline" aria-label="Próxima página" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ArrowRight size={16} />
        </Button>
      </div>
    </footer>
  );
}
