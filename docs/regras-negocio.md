# Regras de negócio — Creator Hub

## Identidade HC Agency

A direção visual fornecida pelo usuário substitui os padrões roxos do documento de referência. Marca HC Agency, paleta lime `#C5EB24`, carbon `#171717`, soft white `#F4F4F4`, cool gray `#E4E3DF`, graphite `#777777` e lavender `#B59AE8` opcional. A fonte aplicada é Outfit, alternativa autorizada à Satoshi, com títulos de peso 800–900. Cartões usam raio de 16px e botões de 12px. Todos os painéis possuem sidebar preta, inclusive o dos creators, conforme ajuste solicitado pelo usuário; o conteúdo principal mantém superfícies claras. O verde destaca ações e um indicador, sem dominar todas as superfícies. Texto secundário usa uma variação de graphite com contraste adequado onde necessário. Indicadores continuam refletindo apenas registros reais; os números conceituais do pedido não viram dados do sistema.

- A equipe intermedeia marcas e creators. Empresas não possuem login. Cadastro público cria exclusivamente creators; o primeiro super administrador é criado pelo script de inicialização com credenciais locais.
- Super administrador e administrador acessam o financeiro. Operador gerencia os fluxos operacionais. Visualizador consulta dados da equipe. Creator consulta somente suas candidaturas, parcerias, entregas, notificações e links, além das oportunidades publicadas.
- Métricas são declaradas pelo creator e possuem data de referência. Nenhuma integração, venda, comissão ou resultado é presumido.
- Candidatura exige cidade e nicho no perfil. Cada creator pode se candidatar uma vez por oportunidade. Perfil e condições são preservados em snapshot e uma proposta comercial inicial é gerada sem dados financeiros internos.
- Aprovação exige oportunidade publicada e vaga disponível. Cada candidatura aprovada gera uma única parceria; todas as operações dependentes ocorrem na mesma transação. Creators recebem notificação da decisão. A parceria congela escopo, contrapartida e prazo da versão comercial mais recente no momento da aprovação; revisões posteriores da proposta não alteram parcerias já criadas.
- Apenas o creator proprietário aceita as condições e envia materiais por HTTPS. Entregas são novos registros e mantêm histórico; a equipe aprova ou solicita ajuste. Encerramento exige pelo menos uma entrega aprovada e confirmação da equipe de que o escopo foi cumprido.
- Alterações verificam a versão original por `updated_at`. Datas de atualização são geradas no PostgreSQL para preservar precisão. Conflitos pedem recarregamento.
- Propostas comerciais possuem versões e campos permitidos explícitos. Exportação PDF usa a impressão do navegador; receitas internas não são incluídas.
- Uma negociação por parceria registra valores em centavos. Valor da empresa equivale à soma de plataforma e creator. Benefícios não monetários são registrados separadamente. Transições financeiras são Pendente → Recebido → Repassado, com confirmação manual. Não há processamento de pagamentos.
- Empresas podem mudar de etapa comercial. Arquivamento é lógico e permitido apenas sem oportunidades vinculadas. Sessões também são excluídas logicamente no logout. Todas as tabelas contêm auditoria e FKs com RESTRICT.
- Links autenticados só são criados após aceite; eventos de acesso não armazenam IP nem fingerprint. O destino HTTPS original é preservado. Endereços IP literais e domínios locais são bloqueados. O servidor não busca o destino.
- Autenticação usa scrypt, token aleatório com hash no banco e cookie HttpOnly, SameSite Strict, com validade de 24 horas e Secure em produção. Limite de tentativas é local ao processo; implantação distribuída exige limitador compartilhado.
- Filtros e exportações usam o mesmo conjunto de dados; tabelas e cartões exibem 15 registros por página. A carga inicial ainda obtém todas as entidades autorizadas e deve migrar para paginação no servidor antes de uma operação de grande escala.
- Uploads privados e integrações de vendas continuam fora desta fase, conforme a pasta de referência. Recuperação de senha, verificação de e-mail, backups e implantação pública precisam ser configurados antes de operar com clientes.

## Execução local

### Banners, materiais e perfis de creators

- Campanhas podem receber um banner por envio JPG/PNG/WebP (até 5 MB) ou URL HTTPS. Apenas a equipe com permissão de escrita pode enviar banners. Imagens enviadas são decodificadas e normalizadas em WebP, sem metadados, e registradas na auditoria. Arquivos ficam em `.local/uploads/banners`; esse diretório precisa de armazenamento persistente no ambiente de implantação. A rota de imagem exige uma sessão válida. Campanhas antigas sem banner mantêm uma capa padrão.
- O cadastro aceita um link principal e até 20 links de apoio, um por linha, com título opcional separado por `|`. Os links são preservados nas condições da parceria no momento da aprovação. Materiais externos continuam sujeitos às permissões do provedor onde estão hospedados.
- Para creators, link principal e materiais são removidos dos dados retornados pelo servidor nas oportunidades e nas parcerias sem aceite. Após o aceite pelo proprietário, aparecem em Minhas parcerias. A equipe pode consultar antes do aceite. Não há upload de anexos de apoio nesta etapa: eles são disponibilizados por links.
- Materiais locais das três campanhas fictícias possuem páginas de briefing e referências que também validam sessão, propriedade e aceite no servidor. São exemplos, não ofertas reais.
- Creators aparecem em lista com busca e paginação. O nome e o botão Ver perfil abrem a ficha com dados, métricas declaradas, foto, apresentação, portfólio, até oito imagens e links de vídeos/materiais cadastrados pelo creator. Perfis sem conteúdo exibem estados vazios, sem inventar portfólio ou fotos pessoais.
- As marcas Leve Lava, Brand Experience e Lifestyle em Movimento e seus banners são fictícios. Banners gerados com a ferramenta nativa imagegen: fotografia de lavanderia com toalhas e máquinas, still-life de skincare e fotografia de dois corredores com vestuário preto e lime. Os prompts completos e arquivos finais estão em `public/images/campaigns/generation.json` e `public/images/campaigns/*.webp`.

Configurações de pacote, TypeScript e framework ficam na raiz por exigência das ferramentas; código, infraestrutura, scripts e regras seguem as pastas indicadas nos MDs.

1. Instalar as dependências com `pnpm install`.
2. Copiar `.env.example` para `.env` e definir senha do PostgreSQL, DATABASE_URL, ADMIN_EMAIL e ADMIN_PASSWORD.
3. Executar `docker compose --env-file .env -f config/compose.yaml up -d`.
4. Executar `pnpm db:migrate` e `pnpm db:seed`.
5. Executar `pnpm dev` e abrir http://127.0.0.1:3000.

Verificações: `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build`.

Alternativa sem Docker: `pnpm db:local` inicia PostgreSQL 16 portátil na porta 55432, cria `.env` apenas se ainda não existir, aplica migrações e cria a conta inicial. Credenciais aleatórias ficam em `.local/access.txt`; ambos os locais são ignorados pelo Git. Mantenha esse processo aberto e execute `pnpm dev` em outro terminal. O script recusa gerenciar bancos que não sejam `127.0.0.1:55432`.

## Validação desta implementação

Migrações aplicadas em PostgreSQL 16.14. TypeScript, lint, cinco testes automatizados e compilação de produção passaram. A integração testa FKs, candidatura única, valores financeiros inválidos, filtro por proprietário, exclusão lógica, auditoria e conflito de versão; suas transações são revertidas.

No navegador foram exercitados login, cadastro de empresa e oportunidade, cadastro de creator e perfil, candidatura, proposta com nova versão, aprovação, aceite, entrega, revisão e negociação financeira. Desktop, tema escuro e largura de 375px foram inspecionados. Os registros identificados como validação são fictícios e ficam apenas no banco local. Não representam marcas, pagamentos ou resultados reais. Prévias da interface ficam em `docs/previews/`.

- Identidade visual HC Agency: tokens centrais verde #C7F000, preto #101010, magenta #F72585, branco #FFFFFF e fundo #F5F5F5. Magenta em destaques e ações secundárias; status mantêm cores semânticas. Ilustrações 3D somente nas imagens. Empresas continuam sem login, gerenciadas pela equipe.

- App instalável (PWA) compartilha rotas, autenticação e permissões do sistema web. Requer HTTPS em produção; localhost só permite instalação no próprio computador. Dados de contas, páginas autenticadas, materiais e mutações nunca são armazenados pelo service worker. Somente o aviso público /offline pode ser armazenado. Instalação depende do suporte do navegador; Safari recebe instruções para Tela de Início ou Dock. Sem conexão, a operação exige reconexão e não promete salvar alterações offline.

## Produção no EasyPanel

- Build pelo Dockerfile na raiz. Aplicação escuta 0.0.0.0 na porta 3000; domínio do EasyPanel deve apontar à porta interna 3000, com HTTPS.
- Criar serviço PostgreSQL 16 separado e configurar DATABASE_URL com o host interno do serviço, usuário, senha e banco. Nunca usar 127.0.0.1 para o banco de outro container.
- Definir ADMIN_EMAIL e ADMIN_PASSWORD (pelo menos 12 caracteres) nas variáveis de ambiente do serviço. O primeiro início aplica migrações e cria a conta administrativa com auditoria. Reinícios não alteram senhas, permissões nem registros já existentes. Sem essas variáveis, as tabelas são criadas, mas não há conta inicial da equipe.
- Configurar volume persistente em /app/.local/uploads para banners enviados. O banco deve ter armazenamento persistente próprio. O container roda com usuário node (UID 1000); o volume precisa permitir escrita para esse usuário.
- Segredos são fornecidos em runtime: .env, .local e capturas ficam fora do contexto Docker. O build não precisa acessar o banco. A tela inicial lê a configuração de banco por requisição.

## Ofertas de empresas e diagnóstico administrativo

- Empresas continuam sem login e são cadastradas pela equipe. Apenas admin e super_admin podem gerar/revogar links de ofertas, ler os envios, criar rascunhos a partir deles e executar o diagnóstico do sistema. Operadores, visualizadores e creators não recebem esses controles nem autorização no servidor.
- Convites são vinculados a uma empresa ativa, têm validade de 30 dias e token aleatório de 256 bits; o banco armazena somente o hash. Novo link revoga os anteriores da mesma empresa. O endereço completo aparece apenas na geração; o administrador copia e compartilha por sua conta.
- O formulário público aceita contato, proposta, contrapartida, escopo, prazo, imagem por URL HTTPS e materiais por links. Exige consentimento para contato; não aceita seleção de outra empresa nem publicação pelo cliente. Cada link admite até 50 ofertas ativas, com bloqueio transacional para concorrência.
- Envios entram em company_offers para revisão. Conversão cria oportunidade em Rascunho e referencia a oferta, com bloqueio para evitar conversões duplicadas. Publicação continua manual no Marketplace. Links e ofertas possuem metadados de auditoria, exclusão lógica e FKs RESTRICT. Cada mutação registra audit_log na mesma transação; a atribuição técnica do envio externo usa o administrador responsável pelo convite, com ação explicitamente identificada como envio pela empresa e contato armazenado na oferta.
- Creators mantêm auto cadastro e edição do próprio perfil, com eventos de auditoria e isolamento de propriedade. O diagnóstico consulta todas as 15 tabelas, colunas de auditoria, contagens ativas, FKs e creators sem evento de cadastro; perfis incompletos são informados sem inventar métricas.
- Redis não armazena tabelas de negócio. REDIS_URL aceita somente redis:// ou rediss://. O cliente testa PING e leitura/escrita com expiração e aplica contador atômico com TTL a autenticação e formulários; chaves usam identificadores derivados, sem dados de perfil. Falhas mantêm o limite local de login e são exibidas como indisponibilidade no diagnóstico. Redis não é requisito para persistir cadastros: PostgreSQL é a fonte de verdade. No formulário público, a cota persistente por convite continua ativa sem Redis.
- O diagnóstico reflete apenas o ambiente em que foi executado, não presume que os serviços remotos estejam saudáveis e nunca retorna URLs de conexão ou senhas. A migração 0002 adiciona apenas as duas tabelas do novo fluxo, preservando dados existentes.

- Creators sem cidade ou nicho recebem uma chamada para completar o perfil na visão geral. O bloqueio de candidatura por perfil incompleto permanece no servidor.

### Cadastro externo de empresas
- Em Empresas → Cadastrar empresa, a administração pode preencher manualmente ou gerar e copiar um link de cadastro para uma empresa nova, sem cadastro prévio.
- O link individual é válido por 30 dias, não cria login e admite um único cadastro; somente o hash do token fica no banco. A criação do link é restrita a admin/super_admin.
- O formulário exige empresa, segmento, cidade, responsável, e-mail, WhatsApp com DDD e autorização de contato. A etapa inicial é Contato feito e não pode ser escolhida externamente.
- Cadastro da empresa, consumo do convite, convite de ofertas e auditorias são gravados na mesma transação. A trava do convite impede cadastros duplicados por reenvio.
- Após cadastrar, a empresa escolhe Cadastrar oferta ou Entrar em contato com a equipe pelo WhatsApp (55 71 92001-7753, informado pelo responsável). A mensagem fica preenchida; o usuário decide enviá-la. A negociação e o fechamento acontecem com a equipe.
- Ofertas externas continuam na caixa de análise administrativa; nenhuma campanha é publicada nem contrato confirmado automaticamente. O diagnóstico inclui company_registration_invites.
