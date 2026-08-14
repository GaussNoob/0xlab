FROM node:22-bookworm-slim AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY apps/runner/package.json apps/runner/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci

FROM dependencies AS builder
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN npm run build --workspace @0xlab/contracts && npm run build --workspace @0xlab/web

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
RUN useradd --system --uid 10001 --create-home oxlab
COPY --from=builder /workspace/apps/web/.next/standalone ./
COPY --from=builder /workspace/apps/web/.next/static ./apps/web/.next/static
RUN mkdir -p /app/data && chown -R oxlab:oxlab /app/data
USER oxlab
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
