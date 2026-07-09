# Kinetic — Treinos Inteligentes

App de treinos com design responsivo (mobile-first, instalável como PWA), banco **Postgres**, contas com aprovação por administrador, gerador de treinos inteligente e tradutor/importador de exercícios via API do Gemini.

## Stack

- **Front:** React 19 + Vite 6 + Tailwind CSS 4 + Motion
- **Back:** Express + tsx, API REST
- **Banco:** Postgres (via `pg`) — recomendado Neon (grátis). Configure `DATABASE_URL`.
- **IA:** Gemini 2.5 Flash (tradução/importação de exercícios) — opcional
- **Gerador:** motor determinístico em `src/generator/` (splits por nível/dias/tempo)

## Rodar localmente

Pré-requisito: Node.js 18+ e um banco Postgres (ex.: Neon).

1. Instale as dependências:
   ```
   npm install
   ```
2. Copie `.env.example` para `.env` e configure ao menos:
   - `DATABASE_URL` — string de conexão do Postgres (obrigatória)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — admin inicial, criado no primeiro start
     (em produção o boot **falha** se `ADMIN_PASSWORD` não estiver definida)
   - `GEMINI_API_KEY` — opcional; sem ela o importador usa um fallback local
3. Inicie o app:
   ```
   npm run dev
   ```
4. Acesse http://localhost:3000 e entre com o e-mail/senha do admin.

## Contas e acesso

- Novos usuários se cadastram por e-mail e ficam **pendentes** até um administrador aprovar.
- O primeiro administrador é criado a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD` no primeiro start.
- Admin gerencia usuários (aprovar, rejeitar, remover) pelo painel no app.

## Build de produção

```
npm run build   # gera o front em dist/ e o servidor em dist/server.cjs
npm start
```

Defina `NODE_ENV=production` e as variáveis (`DATABASE_URL`, `ADMIN_*`, etc.) no painel do host.

## Testes

```
npm test        # test runner nativo do Node (tsx --test tests/*.test.ts)
npm run lint    # checagem de tipos (tsc --noEmit)
```

## Dados e estatísticas

- Perfil, treinos, exercícios e histórico são persistidos no Postgres.
- Streak e estatísticas semanais são **calculados a partir dos logs** (resetam de verdade quando você falta).

## Segurança

- Senhas com hash **scrypt** (assíncrono) + salt e comparação em tempo constante.
- Sessões em cookie httpOnly/SameSite (Secure em produção); tokens de sessão e de
  redefinição são armazenados no banco como **hash sha256**.
- Toda a API `/api/*` exige sessão válida; rotas de admin exigem papel `admin`.
- Rate limit em login (10/min), tradução por IA (5/min) e catálogo (60/min).
- Redefinição de senha por e-mail (link válido por 1 hora); em dev, o link é mostrado no console.
- Trocar a própria senha: `PUT /api/auth/password` com `{ "current": "...", "next": "..." }`.

## Deploy

Veja `DEPLOY.md` (Postgres no Neon + host de sua preferência). Há um `Dockerfile`
pronto (Node 22). O `fly.toml` incluso é um exemplo e ainda contém configuração de
volume/SQLite legada — para Postgres externo, remova as seções `[mounts]`/`DB_PATH`.
