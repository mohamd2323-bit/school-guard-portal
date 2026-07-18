# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json tsconfig.base.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY backups ./backups

RUN pnpm install --frozen-lockfile

FROM deps AS builder

RUN pnpm --filter @workspace/api-server run build
RUN PORT=5173 BASE_PATH=/ pnpm --filter @workspace/school-guards run build

FROM deps AS tools

ENV NODE_ENV=development

FROM node:22-bookworm-slim AS api

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

EXPOSE 3000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

FROM nginx:1.27-alpine AS web

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/artifacts/school-guards/dist/public /usr/share/nginx/html

EXPOSE 80
