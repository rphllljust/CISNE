FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci

FROM deps AS builder
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY prisma ./prisma
COPY test ./test
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM deps AS migrator
COPY prisma ./prisma
RUN npx prisma generate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
EXPOSE 3000
# Sincroniza schema com o banco e inicia o servidor
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
