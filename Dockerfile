# Build reproducible fuera de Railpack (evita EBUSY en node_modules/.vite)
FROM node:22-bookworm-slim

WORKDIR /app

ENV NPM_CONFIG_PRODUCTION=false
ENV VITE_CACHE_DIR=/tmp/vite-cache

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build \
  && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
