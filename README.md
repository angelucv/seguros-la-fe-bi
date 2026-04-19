# Seguros La Fe · BI web (React + Express)

Aplicación tipo **Credix BI** para visualizar datos públicos de **SUDEASEG**: React 19, Vite 6, Tailwind 4 y Express en un solo proceso en desarrollo y producción. El **ETL** vive en la carpeta `etl/` y genera los CSV que consume el BI.

## Requisitos

- Node.js 20+
- CSV en `data/public/` (pueden generarse con el ETL o copiarse desde `etl/output/data/public`). Tras `npm run data:all`, el tablero puede cubrir el rango **2023-01 a 2026-03** (según publicación SUDEASEG) y el tipo de cambio en `bcv_ves_por_usd_mensual.csv` hasta el último mes requerido.

## Uso local

```bash
npm install
npm run dev
```

Abra **http://localhost:3000** (o el puerto que indique la consola). La API responde en el mismo origen (`/api/health`, `/api/data-files`, `/api/bi/*`).

### No arranca o sale y vuelve al prompt

1. **Carpeta correcta:** la terminal debe estar en la raíz del repo (donde está `package.json`), por ejemplo `...\seguros-la-fe-bi`. Si ejecuta `npm run dev` en otra carpeta, npm no encontrará el proyecto.
2. **Dependencias:** `npm install` al menos una vez en esa carpeta.
3. **Puerto 3000 ocupado:** verá un mensaje del servidor. En PowerShell use otro puerto, por ejemplo `npm run dev:3010`, y abra `http://localhost:3010`.
4. **Comprobar entorno:** `npm run doctor` valida `package.json`, `node_modules` y los CSV mínimos en `data/public/`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Express + Vite (middleware) |
| `npm run build` | Build del front → `dist/` |
| `npm start` | Producción: sirve `dist/` + API (`NODE_ENV=production`) |
| `npm run data:download` | Descarga fuentes SUDEASEG (ver `etl/README.md`) |
| `npm run data:transform` | Transforma a CSV en `etl/output/data/public` y **copia** a `data/public` |
| `npm run data:all` | Descarga + transformación + copia a `data/public` |
| `npm run data:sync` | Solo copia `etl/output/data/public` → `data/public` (útil si ya transformó en `etl/`) |

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto (por defecto 3000). |
| `NODE_ENV` | `production` en despliegue. |
| `DATA_DIR` | (Opcional) Ruta absoluta a la carpeta de CSV; por defecto `data/public` relativo al proyecto. |

## Despliegue (Railway / Render u otro)

1. Servicio desde este repositorio.
2. **Build:** `npm install && npm run build`
3. **Start:** `npm start`
4. **Variables:** `NODE_ENV=production`
