FROM oven/bun:1 AS base
WORKDIR /app

ENV NODE_ENV=production

COPY . .

USER bun
ENTRYPOINT [ "bun", "--bun", "run", "src/index.ts" ]