"use client";
import { useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { uploadCampaignBanner } from "@/lib/banner-actions";
import { bannerUrlSchema } from "@/lib/validators";
import { CampaignImage } from "./campaign-image";

export function BannerField({
  value,
  onChange,
  disabled,
  onBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="banner-field">
      <div className="banner-preview">
        {value && bannerUrlSchema.safeParse(value).success ? (
          <CampaignImage key={value} src={value} title="Prévia do banner da campanha" />
        ) : (
          <span>
            <ImagePlus size={25} />
            Prévia do banner
          </span>
        )}
      </div>
      <div className="banner-upload-label">
        <Upload size={16} />
        <span>Enviar imagem (JPG, PNG ou WebP · até 5 MB)</span>
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Enviar imagem do banner"
        disabled={disabled || busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            setError("Envie uma imagem de até 5 MB.");
            event.target.value = "";
            return;
          }
          const input = new FormData();
          input.set("banner", file);
          setError("");
          setBusy(true);
          onBusy(true);
          try {
            const result = await uploadCampaignBanner(input);
            if (result.ok) onChange(result.url);
            else setError(result.error);
          } catch {
            setError("Não foi possível enviar a imagem. Tente novamente.");
          } finally {
            setBusy(false);
            onBusy(false);
            event.target.value = "";
          }
        }}
      />
      <input
        id="bannerUrl"
        type="text"
        aria-label="Ou informe o endereço da imagem do banner"
        placeholder="Ou cole a URL HTTPS da imagem"
        value={value}
        disabled={disabled || busy}
        onChange={(event) => onChange(event.target.value)}
      />
      {busy && <small role="status">Enviando e preparando o banner…</small>}
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
