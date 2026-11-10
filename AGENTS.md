<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regras deste projeto

Este é o Creator Hub reconstruído da pasta de referência fornecida pelo usuário. As instruções originais são `C:/Users/Allan Nascimento/Desktop/FXP IA/AGENTS.md` e `C:/Users/Allan Nascimento/Downloads/agente (1).md`. O segundo arquivo descreve o RentGestor: aplicar seus padrões visuais, sem introduzir módulos de locação no Creator Hub.

- Next.js App Router, TypeScript estrito, Drizzle e PostgreSQL 16. Nunca Prisma ou SQLite.
- Nunca exclusão física: usar `is_deleted` e `deleted_at`. Toda leitura filtra registros excluídos, inclusive nas relações.
- Tabelas possuem `created_at`, `updated_at`, `deleted_at`, `is_deleted`, `modified_by` e FKs com RESTRICT.
- Validar entradas com Zod e autorizar no servidor. Creator só acessa seus registros. Não confiar em controles da interface como autorização.
- Mutação gera auditoria na mesma transação. Edições usam a versão `updated_at` original para detectar conflitos.
- Centralizar regras de negócio. Código em src, testes em tests, infraestrutura em config e ferramentas em scripts. Limite de 500 linhas por arquivo.
- Configurações obrigatórias das ferramentas podem ficar na raiz. Nunca versionar `.env`, credenciais ou dados de `.local`.
- Registrar novas regras em `docs/regras-negocio.md`; não criar documentação avulsa sem pedido.
- Interface em pt-BR. A identidade HC Agency solicitada pelo usuário substitui o roxo/Inter/pílulas dos MDs de referência: lime `#C7F000`, carbon `#101010`, branco `#FFFFFF`, fundo `#F5F5F5` e magenta `#F72585` como terceira cor; preservar cores semânticas de sucesso, alerta e erro. Outfit (alternativa autorizada à Satoshi), títulos de peso 800–900, cartões de 16px e botões de 12px. Sidebar preta em todos os painéis, incluindo creators; conteúdo principal predominantemente claro. Preservar contraste e modo escuro. Nunca usar dados ilustrativos como indicadores reais.
- Formulários com React Hook Form + Zod; campos monetários com máscara em reais e persistência em centavos.
- Confirmação de ações críticas com bloqueio de 3 segundos. Toasts em sonner. Estados de erro, vazio e carregamento explícitos.
- Layout em 375px sem rolagem horizontal; tabelas viram cartões. Controles acessíveis e foco visível.
- Empresas não possuem login; equipe intermedeia as parcerias. Não inventar integrações, vendas ou métricas de redes sociais.
- Antes da entrega: `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build`. Testes de banco só usam PostgreSQL; nunca substituir por SQLite.
