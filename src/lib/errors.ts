import { ZodError } from "zod";
export function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Confira os campos.";
  const code =
    (error as { cause?: { code?: string }; code?: string })?.cause?.code ?? (error as { code?: string })?.code;
  if (code === "23505") return "Este registro já existe. Atualize a página.";
  if (code === "23503") return "O registro relacionado não está disponível.";
  if (code === "40001" || code === "40P01") return "Registro alterado por outro usuário. Recarregue e tente novamente.";
  if (
    error instanceof Error &&
    !/query|connect|ECONN|password authentication|fetch|postgres/i.test(error.message) &&
    error.message.length < 200
  )
    return error.message;
  console.error("Falha na operação do Creator Hub", code ?? "indisponível");
  return "Não foi possível concluir. Verifique a conexão com o banco e tente novamente.";
}
