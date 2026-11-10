"use client";
import { useEffect, useState } from "react";
import { Download, WifiOff } from "lucide-react";
import { Button, Modal } from "./ui";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [available, setAvailable] = useState(false);
  const [offline, setOffline] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const sync = () => {
      setAvailable(
        !(
          display.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone
        ),
      );
      setOffline(!navigator.onLine);
    };
    const timer = window.setTimeout(sync, 0);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const installed = () => {
      setAvailable(false);
      setPrompt(null);
      setHelp(false);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    display.addEventListener("change", sync);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          setError(
            "Não foi possível preparar a instalação. Recarregue a página e tente novamente.",
          );
        });
    }
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      display.removeEventListener("change", sync);
    };
  }, []);

  async function install() {
    if (!prompt) {
      setHelp(true);
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null);
      if (choice.outcome === "accepted") setAvailable(false);
    } catch {
      setError("A instalação não foi concluída. Tente pelo menu do navegador.");
      setHelp(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {offline && (
        <div className="app-offline-notice" role="status">
          <WifiOff size={17} />
          <span>Sem conexão. Reconecte-se antes de salvar alterações.</span>
        </div>
      )}
      {available && (
        <Button
          variant="outline"
          className="app-install-button"
          onClick={() => void install()}
          busy={busy}
        >
          <Download size={17} />
          Instalar app
        </Button>
      )}
      {help && (
        <Modal
          title="Instalar HC Agency"
          description="Acesse pelo ícone na sua tela, em uma janela própria."
          onClose={() => setHelp(false)}
        >
          <div className="app-install-help">
            {error && <p role="alert">{error}</p>}
            <p>
              <strong>Android e computador</strong>
              <br />
              Abra no Chrome ou Edge. No menu do navegador, escolha “Instalar
              app” ou “Instalar HC Agency”.
            </p>
            <p>
              <strong>iPhone e iPad</strong>
              <br />
              Abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela
              de Início”. Ative “Abrir como App”, se essa opção aparecer.
            </p>
            <p>
              <strong>Mac com Safari</strong>
              <br />
              No menu Arquivo, escolha “Adicionar ao Dock”, quando disponível.
            </p>
            <p className="app-install-note">
              A instalação requer um endereço HTTPS ou localhost no próprio
              computador. Para usar no celular, abra o endereço HTTPS publicado
              da plataforma. É necessária conexão para acessar os dados.
            </p>
            <Button onClick={() => setHelp(false)}>Entendi</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
