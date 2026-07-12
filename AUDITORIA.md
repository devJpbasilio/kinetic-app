# Auditoria Completa — Kinetic

> ## 🔄 Reauditoria e correções (2026-07-12)
>
> Nova revisão independente de todo o código (estado atual). A base permaneceu
> **sólida e sem falhas críticas**; os achados foram de dependência, configuração
> operacional e defesa em profundidade. **Score atribuído: 82/100** ("bom/maduro").
>
> **Corrigido no código (commits `c0d43ca`, `f3c5569`, `22181ed`):**
>
> - **[ALTO] Dependência vulnerável** — `nodemailer` `^6.9.16 → ^9.0.3` (resolvia 1 CVE *high*: SMTP command injection / SSRF / DoS via addressparser). `npm audit` agora reporta **0 vulnerabilidades**. Adicionado script `npm run audit` (falha em CVE ≥ high) para o CI. *(A06)*
> - **[MÉDIO] Brute-force / credential stuffing** — **lockout por conta persistido no Postgres** (tabela `login_attempts`), com backoff exponencial (5 falhas → 30s, 60s, 120s … teto 30min). Persistir no banco faz o bloqueio **sobreviver ao cold start do Render Free** e valer **entre instâncias** — o rate limiter em memória (por IP) não faz nenhuma das duas coisas. `checkLoginLockout` responde **429 + `Retry-After`** antes de verificar a senha; credenciais válidas zeram o contador. *(A07 / CWE-307)*
> - **[MÉDIO] Logging & Monitoramento** — **log de auditoria estruturado** (`src/audit.ts`): 1 linha JSON por evento no stdout (coletável por Log Stream do Render). Cobre login (success/failure/locked/denied_pending), register, logout, reset/troca de senha e ações de admin (approve/reject/delete). Registra `userId`/`email`/`ip` e desfecho — **nunca** senhas, tokens ou hashes. *(A09 / CWE-778)*
> - **[MÉDIO] Sessão longa fixa** — **TTL configurável**: sem "manter conectado" → sessão curta de **12h** (padrão seguro); com o checkbox → **30 dias** (agora opt-in). `createSession(userId, ttlMs?)` grava `expires_at` coerente com o `Max-Age` do cookie. Checkbox adicionado à tela de login. *(A07 / CWE-613)*
> - **[BAIXO] XSS via `javascript:` em `href`** — `video_url` sanitizado na origem por `safeExternalUrl()` em `mapCatalogToExercise` (só aceita `http(s)`/relativo próprio), antes de ser renderizado como `href`. *(A03 / CWE-79)*
> - **[BAIXO] Exposição de código** — removido `--sourcemap` do build de produção do servidor (sem `dist/server.cjs.map`). *(A05 / CWE-540)*
> - **[BAIXO] Prompt injection** — input do usuário no `translate-import` agora é cercado por marcadores `<<<DADOS>>>` e tratado como dados, não instruções. *(A04)*
> - **Limpeza de deploy** — host passou a ser **Render**: removido `fly.toml`, `DEPLOY.md` reescrito para Render, comentários de `Dockerfile`/`README.md` atualizados.
>
> **Testes:** suíte ampliada para **21 passando** (4 novos para o backoff de lockout, função pura `loginLockDurationMs`). `tsc --noEmit` limpo · `npm run build` OK.
>
> **⚠️ Pendências EXTERNAS (fora do código — exigem ação no painel):**
> 1. **[ALTO] Rotacionar segredos** — a senha do role Neon e o `ADMIN_PASSWORD` do `.env` devem ser considerados **comprometidos** (ficaram em claro no ambiente de dev/auditoria). Resetar no Neon (Roles → Reset password) e trocar a senha do admin.
> 2. Migrar todos os segredos para **Environment Variables do Render** (nunca em arquivo) e definir `APP_URL` com a URL pública real.
> 3. Configurar **Log Stream** no Render para receber os eventos de auditoria e criar alertas (ex.: muitos `auth.login.failure`).
> 4. Validar pós-deploy: headers de segurança, redirect HTTPS, e que `/server.cjs` e `/.env` retornam 404.
>
> **Não reforçado por decisão de escopo:** rate limit de login por IP em memória (mantido como camada complementar ao lockout por conta); reforço adicional na borda (Cloudflare) fica a critério da operação.
>
> ---
>
> **Status das correções (2026-07-09):** aplicadas — C1, C2, C3, **A1–A9** (todos os altos), M1, M2, M3, M4, M5, M6, M7, M8, M10, M11, M12, B6, B8, além do script `npm test` e da suíte em `tests/` (17 testes passando, `tsc` limpo).
>
> **A8** (scrypt assíncrono), **M2** (tokens de sessão/reset agora armazenados como sha256 — o token bruto só vive no cookie/link; **atenção: sessões e links de reset existentes serão invalidados no deploy**, exigindo novo login), **M3** (transações em `deleteUser` e `createGeneratedPlan`), **M4** (`updateExercise` agora persiste `image_*`/`video_url`) e **M11** (invalidação de resets antigos + limpeza periódica a cada 6h) foram concluídos.
>
> **Também aplicados:** M9 (boot reaproveita o perfil de `/me`, sem refazer `/api/user`), B1 (README reescrito para Postgres/contas/admin), B2 (`fly.toml` sem volume/SQLite), B3 (removidos `__gen_test.ts` e `__wtest_mount.txt`; `db.json`/`kinetic.db*` mantidos por serem dados e já gitignored), B4 (Vite via import dinâmico só em dev + movido para devDependencies), B5 (dotenv carregado uma única vez), B7 (modais com `role="dialog"`/`aria-modal` + Escape para fechar; inputs de login com `aria-label`). Build de produção validado (`npm run build`).
>
> **Únicos pendentes:** M13 (service worker PWA — é adição de funcionalidade, fora do escopo de correção) e B9 (self-host das fontes do Google, hoje via `@import` — o CSP já as permite; melhoria opcional).



**Data:** 2026-07-09 · **Escopo:** 100% do código-fonte (frontend, backend, banco, gerador, configs de deploy) + análise estática (`tsc` limpo) + execução do motor de geração + suíte de testes criada em `tests/`.

---

## 1. Resumo Executivo

O Kinetic é um app de treinos: **React 19 + Vite 6 + Tailwind 4** no front, **Express (server.ts único)** no back, **Postgres (Neon)** via `pg`, autenticação própria (scrypt + sessões em cookie httpOnly), gerador de treinos determinístico (`src/generator/`), proxy para catálogo externo de exercícios (Render) e importação/tradução via Gemini.

A base de segurança é **acima da média para o porte**: queries 100% parametrizadas (sem SQL injection), scrypt com salt + `timingSafeEqual`, cookies httpOnly/SameSite/Secure, CSP+HSTS em produção, rate limiting, isolamento por `user_id` em todas as queries (sem IDOR direto), resposta genérica no "esqueci a senha", proteções de admin (último admin, auto-remoção).

Ainda assim, a auditoria encontrou **34 problemas**: **3 críticos**, **9 altos**, **13 médios** e **9 baixos**. Os mais graves: credenciais de admin com padrão conhecido, TLS do banco sem verificação de certificado, vazamento de erros internos do Postgres para o cliente, o **timer de descanso calcula errado** (funcionalidade central), o **gerador produz planos vazios/contaminados** em cenários válidos da UI, e a **UI exibe dados falsos hardcoded** (gráfico, conquistas, "% no mês", "carga anterior").

**Não existia nenhum teste.** Foi criada uma suíte em `tests/` (Node test runner nativo, sem dependências novas): `npx tsx --test tests/*.test.ts` — 7 invariantes passam; 8 testes `[BUG-*]` **falham de propósito** reproduzindo os defeitos e devem passar após as correções.

---

## 2. Inventário

| Categoria | Itens |
|---|---|
| **Páginas/telas** | Login (login/registro/esqueci-senha), Reset de senha (`/reset?token=`), Dashboard, Treinos (lista + editor), Treino Inteligente (gerador), Histórico, Treino Ativo (execução) |
| **Modais** | Admin de usuários, Perfil (nome/peso/altura/IMC), Registrar Peso, Resumo do Treino |
| **Componentes** | `App.tsx` (rotas por estado + auth + admin + perfil), `DashboardView`, `WorkoutSetupView`, `WorkoutGeneratorView`, `HistoryView`, `ActiveWorkoutView`, `OptionCard`, `Chip` |
| **Endpoints públicos** | `POST /api/auth/{register,login,forgot-password,reset-password,logout}`, `GET /api/auth/me` |
| **Endpoints autenticados** | `GET/PUT /api/user` · `GET/POST /api/exercises`, `PUT/DELETE /api/exercises/:id`, `POST /api/exercises/import`, `POST /api/exercises/translate-import` · `GET/POST /api/workouts`, `PUT/DELETE /api/workouts/:id`, `POST /api/workouts/generate` · `GET/POST /api/workouts/:id/exercises` · `GET /api/workout-exercises`, `PUT/DELETE /api/workout-exercises/:id` · `GET/POST /api/logs` · `GET /api/catalog/exercises[/:id]` (proxy) · `PUT /api/auth/password` |
| **Endpoints admin** | `GET /api/admin/users`, `POST /api/admin/users/:id/{approve,reject}`, `DELETE /api/admin/users/:id` |
| **Tabelas** | `users`, `profiles`, `exercises`, `workouts`, `workout_exercises`, `workout_logs`, `sessions`, `password_resets` |
| **Serviços/módulos** | `src/db.ts` (classe Database), `src/generator/{engine,splits,exercises,types}.ts`, e-mail (Brevo API / SMTP / Gmail), Gemini |
| **Estado global** | Nenhum store — tudo em `useState` no `App.tsx`, passado por props (sem Context/Redux) |
| **Middleware** | headers de segurança, `express.json` (256kb), `requireAuth`, `requireAdmin`, 3 rate limiters em memória |

---

## 3. Lista Completa de Bugs

### 🔴 Críticos

**C1 — Admin bootstrap com credenciais padrão conhecidas**
- **Arquivo:** [src/db.ts:15-16](src/db.ts:15) (`ADMIN_EMAIL='admin@kinetic.local'`, `ADMIN_PASSWORD='kinetic-admin'`)
- **Reproduzir:** subir em produção sem `ADMIN_PASSWORD` no ambiente → login com `admin@kinetic.local` / `kinetic-admin` dá acesso total (aprovar/apagar usuários e dados).
- **Causa:** fallback silencioso; só emite `console.warn`.
- **Correção:** em `NODE_ENV=production`, **recusar o boot** (`throw`) se `ADMIN_PASSWORD` não estiver definido; nunca ter senha default.

**C2 — TLS do Postgres sem verificação de certificado**
- **Arquivo:** [src/db.ts:122](src/db.ts:122) — `ssl: { rejectUnauthorized: false }`
- **Impacto:** conexão vulnerável a MITM; credenciais e dados trafegam por canal "cifrado" sem autenticação do servidor.
- **Correção:** usar `ssl: true` com CA (Neon suporta `sslmode=verify-full`; basta remover o override) ou fornecer o CA bundle.

**C3 — Vazamento de erros internos ao cliente**
- **Arquivo:** [server.ts](server.ts) — todas as rotas fazem `res.status(500).json({ error: e.message })` (ex.: linhas 322, 342, 550, 561…).
- **Reproduzir:** `POST /api/workouts/:id/exercises` com `exercise_id` inexistente → erro de FK do Postgres com nomes de tabela/constraint devolvido ao navegador.
- **Impacto:** divulgação de schema e detalhes internos; facilita ataques.
- **Correção:** logar `e` no servidor e devolver mensagem genérica ("Erro interno"); mapear erros esperados (FK/unique) para 400/409.

### 🟠 Altos

**A1 — Timer de descanso calcula errado (`[BUG-5]`, teste falhando)**
- **Arquivo:** [src/components/ActiveWorkoutView.tsx:93-96](src/components/ActiveWorkoutView.tsx:93)
- **Reproduzir:** descanso `00:30` → timer inicia em **1:30** (90s); `01:00` → 90s; `02:00` → 150s. Só `01:30` funciona por coincidência.
- **Causa:** `parseInt('00') || 1` — zero é falsy e vira o default.
- **Correção:** `const mins = Number.isNaN(parseInt(p[0])) ? 1 : parseInt(p[0])` (idem segundos); extrair para `src/utils/parseRestTime.ts` e apontar o teste para ela.

**A2 — Gerador aceita filtros sem cobertura e salva planos vazios (`[BUG-1/2/4]`)**
- **Arquivos:** [src/generator/exercises.ts](src/generator/exercises.ts) (zero exercícios de `Elástico`/`Kettlebell`), [src/generator/engine.ts:131](src/generator/engine.ts:131), [server.ts:739](server.ts:739)
- **Reproduzir (validado por execução):** UI → Treino Inteligente → equipamentos = só "Elástico" → plano com todos os dias **0 exercícios**, sem erro; "Salvar" cria treinos vazios no banco. Idem restringindo todas as regiões.
- **Correção:** (a) adicionar exercícios de elástico/kettlebell à base ou remover as opções da UI; (b) no endpoint, rejeitar com 422 planos cujo total de exercícios seja 0; (c) na UI, avisar antes de salvar dia vazio.

**A3 — Fallback do gerador contamina o foco do dia (`[BUG-3]`)**
- **Arquivo:** [src/generator/engine.ts:114-126](src/generator/engine.ts:114)
- **Reproduzir (validado):** casa + avançado + 6 dias → "Treino C — Pernas (Quadríceps)" inclui **Supino Reto com Halteres** (peito).
- **Causa:** o fallback completa com *qualquer* exercício do pool quando o dia fica curto.
- **Correção:** restringir o fallback a regiões sinérgicas do foco (ou aceitar dia mais curto).

**A4 — Um request PUT por tecla digitada no editor de treino**
- **Arquivo:** [src/components/WorkoutSetupView.tsx:561-601](src/components/WorkoutSetupView.tsx:561) — inputs de reps/descanso/carga chamam `onUpdateWorkoutExercise` a cada `onChange`, que faz `PUT /api/workout-exercises/:id`.
- **Impacto:** digitar "10 — 12" gera ~7 PUTs; flood de rede, respostas fora de ordem podem sobrescrever estado com valor antigo.
- **Correção:** estado local + persistir no `onBlur` (ou debounce 500ms).

**A5 — `POST /api/logs` sem validação de payload**
- **Arquivo:** [server.ts:878-898](server.ts:878)
- **Reproduzir:** `duration: "abc"` → `Number()` = NaN → erro do pg → 500 vazando mensagem; `duration: -100` aceito e **corrompe as estatísticas** (minutos ativos negativos); `date: "3000-01-01"` aceito (streak infinito futuro).
- **Correção:** validar `duration` inteiro 1–1440, `calories` ≥ 0, `date` no formato `YYYY-MM-DD` e não-futura.

**A6 — `POST /api/workouts/:id/exercises` não valida `exercise_id`**
- **Arquivo:** [server.ts:825-843](server.ts:825) / [src/db.ts:517](src/db.ts:517)
- **Reproduzir:** enviar `exercise_id` inexistente → 500 (FK) com erro interno; enviar id de exercício **de outro usuário** → aceito, criando vínculo órfão que a UI não consegue renderizar (o filtro `exercises.find` retorna undefined e o item some silenciosamente).
- **Correção:** checar `getExerciseById(uid, exercise_id)` antes do insert → 404/400.

**A7 — Dados falsos hardcoded exibidos como reais**
- **Arquivos:** [src/components/HistoryView.tsx:63-141](src/components/HistoryView.tsx:63) — gráfico "Tendência de Massa Muscular" é um SVG estático, badge "+1.2% este mês" fixo, conquista "Sequência de 5 Dias" sempre exibida (mesmo com streak 0), botão "Ver Todos os Troféus" não faz nada; [src/components/ActiveWorkoutView.tsx:318-321](src/components/ActiveWorkoutView.tsx:318) — "Anterior: `{weight-5}` kg" é **inventado** (com carga 0 mostra "-5 kg"); [DashboardView.tsx:215-222](src/components/DashboardView.tsx:215) — sparkline fake.
- **Impacto:** o usuário toma decisões com base em números falsos; mina a confiança.
- **Correção:** gráfico a partir dos logs reais; conquistas condicionais ao streak/carga; remover "anterior" ou buscar do histórico real; remover botão morto.

**A8 — `scryptSync` bloqueia o event loop**
- **Arquivo:** [src/db.ts:271-273](src/db.ts:271) — usado em login, registro, reset e troca de senha.
- **Impacto:** cada verificação (~50–100ms) congela **todas** as requisições; 10 logins/min × N IPs = DoS barato.
- **Correção:** `crypto.scrypt` assíncrono (promisify).

**A9 — Rate limiter em memória cresce sem limite e não sobrevive a múltiplas instâncias**
- **Arquivo:** [server.ts:95-113](server.ts:95) — o `Map` nunca remove janelas expiradas de IPs antigos.
- **Impacto:** leak de memória lento (1 entrada por IP visto); com `auto_stop_machines`/deploys o limite zera; em múltiplas instâncias não é compartilhado.
- **Correção:** varredura periódica (`setInterval` limpando `windowStart` antigos) ou `express-rate-limit`.

### 🟡 Médios

**M1 — Cookie malformado derruba a rota com 500 em vez de 401**
[server.ts:51](server.ts:51) — `decodeURIComponent('%')` lança `URIError`; em `/api/auth/me` (linha 396, fora de try/catch de parsing) vira 500. **Reproduzir:** `curl -H "Cookie: kinetic_session=%" /api/auth/me`. **Correção:** try/catch no decode.

**M2 — Tokens de sessão e de reset armazenados em texto puro**
[src/db.ts:389,421](src/db.ts:389) — leak do banco = sequestro de qualquer sessão ativa e resets pendentes. **Correção:** armazenar `sha256(token)` e comparar hash.

**M3 — `deleteUser` e `createGeneratedPlan` sem transação**
[src/db.ts:375-384,561-588](src/db.ts:375) — falha no meio deixa dados órfãos / plano pela metade. **Correção:** `BEGIN/COMMIT` com client dedicado do pool.

**M4 — `PUT /api/exercises/:id` finge salvar campos que ignora**
[src/db.ts:471-480](src/db.ts:471) — o UPDATE só grava nome/grupo/descrições, mas devolve `merged` incluindo `image_*`/`video_url` como se tivessem sido persistidos. **Correção:** atualizar todas as colunas ou remover os campos da resposta.

**M5 — Toasts se cancelam mutuamente**
[src/App.tsx:269-272](src/App.tsx:269) — `setTimeout` sem clear: um segundo toast dentro de 4s é fechado pelo timer do primeiro. **Correção:** guardar/limpar o timeout em ref.

**M6 — Ações destrutivas do admin sem confirmação**
[src/App.tsx:169-183](src/App.tsx:169) — "Rejeitar" **apaga a conta** e "Remover" apaga usuário + todos os dados com um clique (excluir treino tem confirm; isto não). **Correção:** diálogo de confirmação.

**M7 — Timer de descanso impreciso em segundo plano**
[ActiveWorkoutView.tsx:62-82](src/components/ActiveWorkoutView.tsx:62) — decremento por `setInterval` de 1s; abas em background são throttled → 90s viram minutos. **Correção:** calcular por timestamp-alvo (`endTime - Date.now()`).

**M8 — Estado `elapsedMinutes` atualizado a cada 10s e nunca usado**
[ActiveWorkoutView.tsx:33,53-59](src/components/ActiveWorkoutView.tsx:53) — re-render inútil da tela inteira a cada 10s durante todo o treino. **Correção:** remover (a duração final já é calculada no `handleOpenSummary`).

**M9 — Requests duplicados no boot autenticado**
[src/App.tsx:67-83,228-238](src/App.tsx:228) — `/api/auth/me` já devolve o perfil completo, e `fetchData` busca `/api/user` de novo (que refaz `computeStats` = +2 queries). **Correção:** reaproveitar o payload do `me`.

**M10 — Rotas `/api/*` desconhecidas devolvem HTML do SPA**
[server.ts:903-915](server.ts:903) — `GET /api/nao-existe` (não interceptado pelo `app.use('/api')`? é interceptado pelo requireAuth mas se autenticado cai no fallback) retorna `index.html` 200; um `res.json()` no front quebra com erro confuso. **Correção:** `app.use('/api', (req,res) => res.status(404).json(...))` após as rotas.

**M11 — Limpeza de sessões/resets expirados só no boot**
[src/db.ts:142-143](src/db.ts:142) — processo que roda semanas acumula lixo (cada "esqueci a senha" cria token novo sem invalidar os anteriores). **Correção:** job periódico ou `DELETE` oportunista ao criar novos.

**M12 — Logout não limpa os dados em memória**
[src/App.tsx:218-226](src/App.tsx:218) — `exercises/workouts/logs` continuam no estado; se o próximo login falhar no `fetchData`, a tela de erro convive com dados do usuário anterior atrás. **Correção:** resetar todos os estados no logout.

**M13 — PWA sem service worker**
[index.html:12](index.html:12) + `public/` — manifest existe, mas sem SW não há offline e a instalabilidade fica limitada; o README promete "instalável como PWA". **Correção:** adicionar SW básico (Workbox/vite-plugin-pwa) ou ajustar a promessa.

### 🟢 Baixos

**B1** — README desatualizado: diz SQLite/better-sqlite3, `APP_PASSWORD`, migração de `db.json` — nada disso existe mais ([README.md](README.md)). **B2** — [fly.toml](fly.toml) configura volume/`DB_PATH` para SQLite (morto com Postgres). **B3** — Arquivos legados no repo: `db.json` (contém dados reais de treino), `kinetic.db*`, `__gen_test.ts`, `__wtest_mount.txt`, `metadata.json` (AI Studio). **B4** — `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` em `dependencies` e o `import` estático de `vite` no [server.ts:5](server.ts:5) carrega o Vite **em produção** (memória/imagem Docker maiores); usar `await import('vite')` condicional e mover para devDependencies. **B5** — `dotenv` carregado 2× ([server.ts:1,12-15](server.ts:12)). **B6** — Estimativa de calorias inconsistente: back 7.5/min ([server.ts:890](server.ts:890)) vs front 8/min ([ActiveWorkoutView.tsx:122](src/components/ActiveWorkoutView.tsx:122)). **B7** — Acessibilidade: modais sem `role="dialog"`/`aria-modal`/focus-trap/Escape; inputs de login só com placeholder (sem `<label>`); textos com `/50` de opacidade abaixo de 4.5:1 de contraste. **B8** — Indicador de séries marca a série atual como concluída antes da conclusão ([ActiveWorkoutView.tsx:227-234](src/components/ActiveWorkoutView.tsx:227)); barra de progresso usa `|| 5`% como hack. **B9** — Fontes do Google via `@import` no CSS (render-blocking + dependência externa em produção; CSP já permite, mas self-host seria melhor).

---

## 4. Cobertura das Etapas de Teste

- **Funcional (login/registro/reset/CRUD/geração):** validado por leitura de código + execução do motor. Fluxos de auth bem construídos; defeitos listados acima (A2, A5, A6, M1, M6).
- **Upload/Download/Impressão/Exportação/Importação de arquivos:** o app **não possui** upload/download/exportação — apenas importação por texto (Gemini) e por catálogo. Sem uploads inseguros.
- **SQL Injection:** ausente — 100% parametrizado. **XSS:** React escapa; nenhum `dangerouslySetInnerHTML`. **IDOR:** todas as queries filtram por `user_id` (exceção parcial: A6). **CSRF:** mitigada por `SameSite=Lax` (sem token dedicado — aceitável para o modelo de risco).
- **Responsividade:** mobile-first sólido (safe-areas, bottom nav, font-size 16px anti-zoom iOS, `100dvh`); inconsistência pontual `min-h-screen` vs `min-h-dvh`.
- **Performance:** sem memoização, estado todo no `App` (re-render global a cada tecla nos modais) — irrelevante no porte atual; A4 e M8 são os pontos reais. Sem N+1 no backend (queries diretas por usuário).
- **Banco:** FKs com `ON DELETE CASCADE` onde há FK; `workouts/exercises/workout_logs.user_id` **sem FK** para `users` (integridade dependente do código — ver M3); índices adequados; datas como TEXT ISO (funciona, mas `DATE`/`TIMESTAMPTZ` seria melhor). Sem sistema de migração (schema `IF NOT EXISTS` — mudar coluna existente exigirá intervenção manual).

## 5. Score

| Dimensão | Nota | Justificativa |
|---|---|---|
| Arquitetura | 7/10 | Simples e coerente; server.ts monolítico (900 linhas) e App.tsx (1.２00 linhas) pedem divisão |
| Código | 6.5/10 | Limpo e comentado; validação de entrada irregular, duplicações front/back |
| UX | 6/10 | Fluxos bons; dados fake (A7), timer errado (A1) e destrutivos sem confirmação (M6) pesam |
| UI | 8/10 | Design system consistente, responsivo, polido |
| Performance | 7/10 | OK no porte; A4/M8/A8 são os ofensores |
| Segurança | 6/10 | Fundamentos fortes, mas C1–C3 são inaceitáveis em produção |
| Escalabilidade | 5/10 | Rate limit e sessões ok até ~1 instância; sem paginação; scryptSync |
| Manutenibilidade | 6/10 | Sem migrações de banco, docs desatualizadas, arquivos legados |
| Testabilidade | 4→6/10 | Era 0 teste; motor é puro (testável); lógica inline nos componentes dificulta (A1) |

## 6. Plano de Correção Priorizado

| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 1 | C1 — exigir `ADMIN_PASSWORD` em produção | 🔴 | 15 min |
| 2 | C2 — TLS com verificação de certificado | 🔴 | 30 min |
| 3 | C3 — sanitizar erros 500 | 🔴 | 1–2 h |
| 4 | A1 — corrigir parse do descanso (+extrair util, teste já pronto) | 🟠 | 30 min |
| 5 | A5/A6 — validar payloads de logs e workout-exercises | 🟠 | 1–2 h |
| 6 | A2/A3 — cobertura Elástico/Kettlebell + rejeitar plano vazio + fallback por foco | 🟠 | 2–4 h |
| 7 | A7 — remover/ligar dados fake da UI | 🟠 | 2–4 h |
| 8 | A4 — debounce/onBlur no editor de treino | 🟠 | 1 h |
| 9 | A8 — scrypt assíncrono | 🟠 | 30 min |
| 10 | A9 — limpeza do rate limiter | 🟠 | 30 min |
| 11 | M1, M5, M6, M12 — correções pontuais front/back | 🟡 | 2 h |
| 12 | M2 — hashear tokens de sessão/reset | 🟡 | 1–2 h |
| 13 | M3 — transações | 🟡 | 1–2 h |
| 14 | M4, M9, M10, M11 — consistência de API | 🟡 | 2 h |
| 15 | M7, M8 — timers por timestamp | 🟡 | 1 h |
| 16 | M13 — service worker PWA | 🟡 | 2–4 h |
| 17 | B1–B9 — higiene (docs, deps, legados, a11y) | 🟢 | 3–5 h |

## 7. Testes Criados

```
tests/generator.test.ts   # 5 invariantes (passam) + 4 reproduções de bug (falham até corrigir)
tests/rest-timer.test.ts  # 6 casos do parse de descanso (5 falham até corrigir)
```
Rodar: `npx tsx --test tests/*.test.ts` (usa o test runner nativo do Node; nenhuma dependência adicionada). Sugestão de script: `"test": "tsx --test tests/*.test.ts"` no package.json.

**Regra:** os testes `[BUG-*]` reproduzem os defeitos — corrija o código, não os testes.

## 8. Confiança da Auditoria e Validação Manual Pendente

**Confiança: ~85%.** Todo o código foi lido; `tsc` passa; o gerador foi executado com casos normais e extremos; os bugs A1–A3 foram **reproduzidos por execução**, os demais por análise de código com trecho/linha citados.

Exigiriam validação manual adicional (não executados nesta auditoria por dependerem de credenciais/serviços vivos):
1. **Fluxo real de e-mail** (Brevo/Gmail) — envio, SPF/DKIM, link de reset ponta a ponta.
2. **Chamada real ao Gemini** — formato da resposta, custos, comportamento com texto adversarial (prompt injection tem risco limitado pelo `responseSchema`, mas não foi testado ao vivo).
3. **API externa de exercícios no Render** — cold start ~50s (o timeout de 20s do proxy pode ser curto), formato real dos campos.
4. **Teste visual em dispositivos reais** (iOS Safari/notch, Android) — o código sugere bom suporte, mas pixel-perfect exige device.
5. **Comportamento sob concorrência real no Postgres/Neon** (pool, limites do plano free).
