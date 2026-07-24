# Not needed for Vercel deployment (Vercel builds this Next.js app natively -
# see README). This Dockerfile is only for self-hosting elsewhere.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm install (not `npm ci`) - the lockfile is generated on ARM64 Windows and
# is missing some Linux-specific optional dependency entries, so `npm ci`'s
# strict lockfile-match check fails on this (typically x64 Linux) build
# target. `npm install` resolves correctly for whatever platform it's
# actually running on.
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Next.js's standalone output tracing doesn't reliably pick up Prisma's
# generated WASM query-compiler engine file, so it's missing at runtime
# unless copied explicitly (ENOENT on query_compiler_bg.wasm otherwise).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "server.js"]
