"use client";
import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Modal } from "./ui";
import { money, todayBR } from "@/lib/format";
import { BannerField } from "./banner-field";
import { CompanyRegistrationLink } from "./company-registration-link";
export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "url" | "money" | "select" | "banner";
  options?: { value: string; label: string }[];
  optional?: boolean;
  help?: string;
};
export type FormSpec = {
  companyRegistration?: boolean;
  title: string;
  description?: string;
  fields: Field[];
  schema: z.ZodType;
  values?: Record<string, string>;
  submit: (data: Record<string, unknown>) => Promise<boolean>;
};
export function RecordForm({ spec, onClose }: { spec: FormSpec; onClose: () => void }) {
  const [uploading, setUploading] = useState(false);
  const form = useForm<Record<string, string>>({
    mode: "onChange",
    resolver: zodResolver(spec.schema as never) as Resolver<Record<string, string>>,
    defaultValues: {
      ...Object.fromEntries(spec.fields.map((f) => [f.name, f.options?.[0]?.value ?? ""])),
      ...spec.values,
    },
  });
  const { isDirty, isSubmitting, errors } = form.formState;
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty || uploading) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, uploading]);
  const close = () => {
    if (!isSubmitting && !uploading && (!isDirty || window.confirm("Descartar as alterações não salvas?"))) onClose();
  };
  return (
    <Modal title={spec.title} description={spec.description} onClose={close}>
      {spec.companyRegistration && <CompanyRegistrationLink />}
      <form
        className="record-form"
        onSubmit={form.handleSubmit(async (d) => {
          if (await spec.submit(d)) onClose();
        })}
        aria-busy={isSubmitting}
      >
        <div className="form-grid">
          {spec.fields.map((f) => (
            <label
              key={f.name}
              className={f.type === "textarea" || f.type === "banner" ? "span-full" : ""}
              htmlFor={f.name}
            >
              {f.label}
              {!f.optional && <span className="required"> *</span>}
              {f.type === "banner" ? (
                <Controller
                  name={f.name}
                  control={form.control}
                  render={({ field }) => (
                    <BannerField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      onBusy={setUploading}
                    />
                  )}
                />
              ) : f.type === "select" ? (
                <select id={f.name} {...form.register(f.name)} aria-invalid={!!errors[f.name]}>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea id={f.name} {...form.register(f.name)} rows={3} aria-invalid={!!errors[f.name]} />
              ) : f.type === "money" ? (
                <Controller
                  name={f.name}
                  control={form.control}
                  render={({ field }) => (
                    <input
                      id={f.name}
                      inputMode="decimal"
                      value={money(Number(field.value || 0))}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      aria-invalid={!!errors[f.name]}
                    />
                  )}
                />
              ) : (
                <input
                  id={f.name}
                  type={f.type ?? "text"}
                  max={f.name === "metricsDate" ? todayBR() : undefined}
                  {...form.register(f.name)}
                  aria-invalid={!!errors[f.name]}
                />
              )}
              {f.help && <small className="field-help">{f.help}</small>}
              <small className="field-error">{String(errors[f.name]?.message ?? "")}</small>
            </label>
          ))}
        </div>
        <footer className="dialog-footer">
          <Button type="button" variant="outline" disabled={isSubmitting || uploading} onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" busy={isSubmitting || uploading} disabled={!form.formState.isValid}>
            Salvar
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
