# IKEZAKI OS Worker (BullMQ) — docker compose の full プロファイル用
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai/package.json ./packages/ai/
COPY packages/integrations/package.json ./packages/integrations/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/

RUN pnpm install

COPY . .

ENV NODE_ENV=production
RUN pnpm --filter @hokko/db generate

CMD ["pnpm", "--filter", "@hokko/worker", "start"]
