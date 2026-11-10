FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && node scripts/build-bootstrap.mjs

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/bootstrap.cjs ./bootstrap.cjs
COPY --from=builder --chown=node:node /app/src/lib/db/migrations ./migrations
COPY --chown=node:node config/docker-entrypoint.sh ./docker-entrypoint.sh
RUN mkdir -p /app/.local/uploads/banners /app/.next/cache && chown -R node:node /app/.local /app/.next/cache
USER node
EXPOSE 3000
VOLUME ["/app/.local/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/manifest.webmanifest').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
