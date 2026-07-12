# Deploy do Kinetic — Render (grátis) + Postgres no Neon (grátis)

O Kinetic usa **Postgres** (Neon) e roda como um Web Service no **Render**. O plano:
1. Criar o banco no **Neon** (grátis) e pegar a connection string.
2. Testar localmente apontando para o Neon.
3. Subir o código no **GitHub**.
4. Criar o Web Service no **Render** conectando o repositório e configurando as variáveis.

---

## 1. Criar o banco no Neon

1. Acesse https://neon.tech e crie uma conta (pode entrar com o Google).
2. Crie um projeto (ex.: "kinetic"). Escolha a região mais próxima (ex.: AWS São Paulo, se disponível).
3. Copie a **Connection string** (formato `postgresql://usuario:senha@ep-...neon.tech/neondb?sslmode=require`).
   - Se aparecer "Pooled connection", pode usar essa.

> Segurança: nunca comite a connection string. Ela fica só no `.env` local (ignorado
> pelo git) e nas Environment Variables do Render. Se precisar rotacionar a senha,
> use **Neon → Roles → Reset password**.

## 2. Testar localmente com o Neon

Edite o arquivo `.env` na pasta do projeto:

```
DATABASE_URL="postgresql://usuario:senha@ep-...neon.tech/neondb?sslmode=require"
ADMIN_EMAIL="seu-email@exemplo.com"
ADMIN_PASSWORD="uma-senha-forte"
```

Depois, no PowerShell:

```powershell
cd "C:\Projetos\Kinetic\kinetic"
npm install
npm run dev
```

Abra http://localhost:3000 e faça login como admin. Os dados ficam no Neon (nuvem).

## 3. Subir o código no GitHub

1. Instale o **GitHub Desktop**: https://desktop.github.com.
2. **File → Add local repository** → aponte para `C:\Projetos\Kinetic\kinetic`.
   - Se não for um repositório Git, clique em **create a repository**.
3. Confirme que o `.gitignore` ignora `.env`, `node_modules`, `dist`, `kinetic.db*`
   e `db.json` (já configurado — seus segredos não vão pro GitHub).
4. **Commit** e depois **Publish repository** — escolha **Private**.

## 4. Criar o Web Service no Render

1. Acesse https://render.com e crie uma conta (pode entrar com o GitHub).
2. **New → Web Service** e conecte o repositório `kinetic`.
3. **Runtime / Build** — escolha uma abordagem e mantenha consistente:
   - **Docker** (recomendado): o Render detecta o `Dockerfile` automaticamente. O
     start vem do próprio Dockerfile (`node dist/server.cjs`).
   - **Node**: **Build Command** = `npm ci && npm run build` · **Start Command** = `npm start`.
4. **Instance Type**: **Free** (para começar).
5. **Health Check Path**: `/`.
6. **Environment Variables** — adicione (marque como secretas quando possível):
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = a connection string do Neon
   - `ADMIN_EMAIL` = seu e-mail de admin
   - `ADMIN_PASSWORD` = sua senha forte de admin **(obrigatória em produção)**
   - `APP_URL` = a URL pública do Render (ex.: `https://SEU-APP.onrender.com`) —
     confirme após o primeiro deploy e ajuste
   - `EXERCISES_API_URL` = `https://api-exercicios-fisicos.onrender.com`
   - (e-mail — recomendado, pois o Render bloqueia SMTP) `BREVO_API_KEY`, `MAIL_FROM`
   - (opcional) `GEMINI_API_KEY`
   - **Não** defina `PORT` — o Render injeta a dele e o código já respeita.
7. Clique em **Create Web Service**. Acompanhe os logs; ao terminar, o Render mostra a URL pública.
8. Abra a URL e faça login como admin.

> Dica: os links de "esqueci a senha" usam `APP_URL`. Faça o primeiro deploy, copie a
> URL gerada pelo Render, ajuste `APP_URL` e faça um novo deploy.

---

## Atualizar depois de mudanças

1. No GitHub Desktop: **Commit** e **Push**.
2. O Render detecta o push e faz o **redeploy automático**. O banco (Neon) não é afetado.

## Observações

- **E-mail:** o Render **bloqueia SMTP** — use **Brevo via API HTTPS** (`BREVO_API_KEY` +
  `MAIL_FROM` com remetente verificado). Sem provedor, o link de reset é só logado no console.
- **HTTPS:** o Render fornece HTTPS automático e redireciona HTTP→HTTPS — por isso o
  cookie `Secure`, o HSTS e o CSP entram em ação em produção.
- **Cold start (Free):** a instância Free "dorme" após ~15 min ociosa e leva alguns
  segundos para acordar. Isso **zera o rate limiter em memória** a cada spin-up — para
  proteção real contra brute force, use um plano pago, um rate limit na borda
  (Cloudflare) ou lockout persistido no banco.
- **Primeiro admin:** criado no primeiro start a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
  Defina-os antes do primeiro deploy.
- **Validação pós-deploy:** confira os headers de segurança e o redirect HTTPS:
  `curl -sI https://SEU-APP.onrender.com/` e confirme que `/server.cjs` e `/.env` retornam 404.
