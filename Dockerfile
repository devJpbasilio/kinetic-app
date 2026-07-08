# Kinetic — imagem de produção (Node + Express, banco Postgres externo)
FROM node:22-slim

WORKDIR /app

# Instala dependências (usa o lockfile para builds reproduzíveis)
COPY package*.json ./
RUN npm ci

# Copia o código e gera o build (frontend em dist/ + servidor em dist/server.cjs)
COPY . .
RUN npm run build && npm prune --omit=dev

# NODE_ENV, DATABASE_URL e demais variáveis vêm do painel do host (Koyeb)
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
