# Imagen de producción para Railway (evita EBUSY en caché de Vite dentro de node_modules)
FROM node:22-bookworm-slim

WORKDIR /app

ENV NPM_CONFIG_PRODUCTION=false
ENV VITE_CACHE_DIR=/tmp/vite-cache

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build del front con optimizaciones de producción; luego se quitan devDependencies (Vite, etc.)
ENV NODE_ENV=production
RUN npm run build && npm prune --omit=dev

# Railway inyecta PORT en tiempo de ejecución (el servidor lee process.env.PORT)
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
