"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, Check, LockKeyhole } from "lucide-react";
import { authenticate } from "@/lib/auth-actions";
import { loginSchema, registerSchema } from "@/lib/validators";
import { Button } from "./ui";
import { Brand } from "./brand";
export function AuthScreen({ configured, onSuccess }: { configured: boolean; onSuccess: () => void }) {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(register ? registerSchema : loginSchema.extend({ name: z.string() })),
    defaultValues: { name: "", email: "", password: "" },
  });
  return (
    <main id="main" className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="auth-copy">
          <span className="eyebrow">HC AGENCY / CREATOR PLATFORM</span>
          <h1>
            Seu talento.
            <br />
            As marcas certas.
            <br />
            <em>Possibilidades reais.</em>
          </h1>
          <p>O próximo capítulo da sua jornada como creator começa com uma boa conexão.</p>
          <div className="story-points">
            {[
              "Oportunidades alinhadas ao seu conteúdo",
              "Parcerias acompanhadas pela nossa equipe",
              "Do primeiro contato à entrega final",
            ].map((t) => (
              <div key={t}>
                <Check size={17} />
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="auth-creator-photo" role="img" aria-label="Influenciadora criando conteúdo para marcas" />
        <footer>Um espaço para construir algo maior, juntos.</footer>
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <span className="eyebrow">SEU ESPAÇO DE CRIAÇÃO</span>
          <h2>{register ? "Faça parte do hub." : "Bom ter você por aqui."}</h2>
          <p>
            {register
              ? "Crie seu perfil e encontre sua próxima parceria."
              : "Entre para acompanhar suas conexões e oportunidades."}
          </p>
          {!configured && (
            <div role="alert" className="notice">
              <strong>Configuração do banco pendente</strong>
              <br />
              Conecte o PostgreSQL e crie a conta da equipe para começar.
            </div>
          )}
          <form
            onSubmit={form.handleSubmit(async (d) => {
              setError("");
              const r = await authenticate(d, register);
              if (r.ok) onSuccess();
              else setError(r.error);
            })}
            aria-busy={form.formState.isSubmitting}
          >
            {register && (
              <label>
                Seu nome
                <input autoComplete="name" {...form.register("name")} aria-invalid={!!form.formState.errors.name} />
                <small className="field-error">{form.formState.errors.name?.message}</small>
              </label>
            )}
            <label>
              E-mail
              <input
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                {...form.register("email")}
                aria-invalid={!!form.formState.errors.email}
              />
              <small className="field-error">{form.formState.errors.email?.message}</small>
            </label>
            <label>
              Senha
              <input
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="Pelo menos 12 caracteres"
                {...form.register("password")}
                aria-invalid={!!form.formState.errors.password}
              />
              <small className="field-error">{form.formState.errors.password?.message}</small>
            </label>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <Button type="submit" busy={form.formState.isSubmitting} disabled={!configured}>
              {register ? "Criar minha conta" : "Entrar na plataforma"}
              <ArrowUpRight size={18} />
            </Button>
          </form>
          <div className="auth-switch">
            {register ? "Já tem uma conta?" : "Ainda não faz parte?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
                form.clearErrors();
              }}
            >
              {register ? "Entrar" : "Cadastre-se como creator"}
            </button>
          </div>
          <p className="secure-note">
            <LockKeyhole size={14} /> Seu acesso é pessoal e protegido.
          </p>
        </div>
      </section>
    </main>
  );
}
