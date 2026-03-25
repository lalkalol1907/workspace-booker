ARG NODE_VERSION=25

FROM node:${NODE_VERSION}-alpine AS base
RUN npm install -g pnpm@10.29.2
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/api apps/api
COPY apps/web apps/web
COPY apps/admin apps/admin
RUN pnpm --filter api run build
RUN pnpm --filter web run build
RUN pnpm --filter admin run build

FROM base AS api
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
RUN pnpm install --frozen-lockfile --filter api --prod
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM nginx:1.27-alpine AS web
RUN apk add --no-cache gettext
ENV API_UPSTREAM=api:3000
ENV PLATFORM_HOST=platform.localhost
COPY docker/nginx-web.conf.template /etc/nginx/default.conf.template
COPY docker/web-entrypoint.sh /web-entrypoint.sh
RUN chmod +x /web-entrypoint.sh
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/admin
EXPOSE 80
ENTRYPOINT ["/web-entrypoint.sh"]
