ARG NODE_VERSION=25

FROM node:${NODE_VERSION}-alpine AS base
RUN npm install -g pnpm@10.29.2
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/api apps/api
COPY apps/web apps/web
RUN pnpm --filter api run build
RUN pnpm --filter web run build

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
ENV API_UPSTREAM=api:3000
COPY docker/nginx-web.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
