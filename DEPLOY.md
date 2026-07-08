# Deploy do Kinetic — Koyeb (grátis) + Postgres no Neon (grátis)

O Kinetic agora usa **Postgres** (em vez de SQLite). O plano:
1. Criar o banco no **Neon** (grátis) e pegar a connection string.
2. Testar localmente apontando para o Neon.
3. Subir o código no **GitHub** (via GitHub Desktop, sem terminal).
4. Criar o serviço no **Koyeb** conectando o repositório e configurando as variáveis.

---

## 1. Criar o banco no Neon

1. Acesse https://neon.tech e crie uma conta (pode entrar com o Google).
2. Crie um projeto (ex.: "kinetic"). Escolha a região mais próxima (ex.: AWS São Paulo, se disponível).
3. Na tela do projeto, copie a **Connection string** (formato `postgresql://usuario:senha@ep-...neon.tech/kinetic?sslmode=require`).
   - Se aparecer a opção "Pooled connection", pode usar essa.

## 2. Testar localmente com o Neon

Abra/edite o arquivo `.env` na pasta do projeto e adicione (com a string que você copiou):

```
DATABASE_URL="postgresql://usuario:senha@ep-...neon.tech/kinetic?sslmode=require"
```

Confirme que o `.env` também tem `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Depois, no PowerShell:

```powershell
cd "C:\Projetos\Kinetic\kinetic"
npm install
npm run dev
```

Abra http://localhost:3000 e faça login como admin. Os dados agora ficam no Neon (nuvem).

## 3. Subir o código no GitHub (sem terminal)

1. Instale o **GitHub Desktop**: https://desktop.github.com (e crie uma conta no github.com se não tiver).
2. No GitHub Desktop: **File → Add local repository** e aponte para `C:\Projetos\Kinetic\kinetic`.
   - Se ele disser que não é um repositório Git, clique em **create a repository** (ele inicializa pra você).
3. Confirme que o `.gitignore` já ignora `.env`, `node_modules` e `dist` (já está configurado — seus segredos não vão pro GitHub).
4. Escreva um resumo (ex.: "primeira versão") e clique em **Commit**.
5. Clique em **Publish repository** — escolha **Private** (privado) e publique.

## 4. Criar o serviço no Koyeb

1. Acesse https://www.koyeb.com e crie uma conta (pode entrar com o GitHub).
2. **Create Web Service → GitHub** e autorize o Koyeb a acessar seu repositório `kinetic`.
3. Em configurações de build, o Koyeb detecta o `Dockerfile` automaticamente (deixe assim).
4. **Instance**: escolha o tipo **Free**.
5. **Port**: 3000 (o Koyeb mapeia para HTTPS público automaticamente).
6. **Environment variables** — adicione (troque pelos seus valores):
   - `DATABASE_URL` = a connection string do Neon
   - `NODE_ENV` = `production`
   - `ADMIN_EMAIL` = seu e-mail de admin
   - `ADMIN_PASSWORD` = sua senha forte de admin
   - `APP_URL` = a URL pública do Koyeb (algo como `https://kinetic-SEUNOME.koyeb.app`) — você confirma o valor final após o primeiro deploy e ajusta
   - `EXERCISES_API_URL` = `https://api-exercicios-fisicos.onrender.com`
   - (opcional, e-mail) `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM`
   - (opcional) `GEMINI_API_KEY`
7. Clique em **Deploy**. Acompanhe os logs; ao terminar, o Koyeb mostra a URL pública.
8. Abra a URL e faça login como admin.

> Dica: se você não souber a URL antes do deploy, faça o primeiro deploy, copie a URL que o Koyeb gerou, ajuste a variável `APP_URL` com ela e faça um novo deploy (os links de "esqueci a senha" usam `APP_URL`).

---

## Atualizar depois de mudanças

1. No GitHub Desktop: **Commit** as mudanças e **Push**.
2. O Koyeb detecta o push e faz o redeploy automaticamente. O banco (Neon) não é afetado.

## Observações

- **Grátis:** o Neon tem plano gratuito (1 projeto, ~0.5 GB) e o Koyeb tem uma instância Free. Confira os limites atuais nos sites, pois mudam.
- **Cold start:** a instância Free pode "dormir" quando ociosa e levar alguns segundos para acordar no primeiro acesso.
- **HTTPS:** o Koyeb fornece HTTPS automático — por isso o cookie `Secure`, o HSTS e o CSP entram em ação em produção.
- **Primeiro admin:** criado no primeiro start a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Defina-os antes do primeiro deploy.
- Os arquivos `Dockerfile` são usados pelo Koyeb. O `fly.toml` (de uma opção anterior) não é usado pelo Koyeb e pode ser ignorado.
