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
COPY apps/runner apps/runner
RUN npm run build --workspace @0xlab/contracts && npm run build --workspace @0xlab/runner

FROM docker:29-cli AS docker-cli

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=dependencies /workspace/node_modules ./node_modules
RUN rm -rf ./node_modules/@0xlab/contracts && mkdir -p ./node_modules/@0xlab/contracts
COPY --from=builder /workspace/packages/contracts/package.json ./node_modules/@0xlab/contracts/package.json
COPY --from=builder /workspace/packages/contracts/dist ./node_modules/@0xlab/contracts/dist
COPY --from=builder /workspace/apps/runner/dist ./dist
EXPOSE 8787
CMD ["node", "dist/server.js"]
