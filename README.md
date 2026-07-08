# Kinetic — Treinos Inteligentes

App de treinos com design responsivo (mobile-first, instalável como PWA), banco SQLite local, login com sessões e tradutor inteligente de exercícios via API do Gemini.

## Stack

- **Front:** React 19 + Vite 6 + Tailwind CSS 4 + Motion
- **Back:** Express + tsx, API REST
- **Banco:** SQLite (better-sqlite3) — arquivo `kinetic.db` criado automaticamente
- **IA:** Gemini 2.5 Flash (tradução/importação de exercícios)

## Rodar localmente

Pré-requisito: Node.js 18+

1. Instale as dependências:
   ```
   npm install
   ```
2. Copie `.env.example` para `.env` e configure:
   - `GEMINI_API_KEY` — chave da API do Gemini (opcional; sem ela o tradutor usa um fallback local)
   - `APP_PASSWORD` — senha de login (opcional; padrão `kinetic123` se não definida antes do primeiro start)
3. Inicie o app:
   ```
   npm run dev
   ```
4. Acesse http://localhost:3000 e entre com a senha.

## Build de produção

```
npm run build
npm start
```

## Dados

- O banco fica em `kinetic.db` (ignorado pelo git).
- Na primeira execução, se existir um `db.json` legado, os dados são **migrados automaticamente** para o SQLite.
- Perfil, treinos, exercícios e histórico são persistidos; streak e estatísticas semanais são **calculados a partir dos logs** (resetam de verdade quando você falta).

## Segurança

- Login com senha (hash scrypt) e sessões via cookie httpOnly (30 dias).
- Toda a API `/api/*` exige sessão válida.
- Endpoint de tradução por IA com rate limit (5/min) e limite de 20 mil caracteres.
- Para trocar a senha: `PUT /api/auth/password` com `{ "current": "...", "next": "..." }`.
