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

## Despliegue en Railway

El repo incluye **`Dockerfile`** y **`railway.toml`**: Railway construye con Docker (build reproducible) y arranca con `npm start`. El healthcheck usa **`GET /api/health`**.

### Pasos

1. **Cuenta y proyecto**  
   Entra en [railway.app](https://railway.app), crea un proyecto y elige **Deploy from GitHub repo**.  
   Autoriza a Railway y selecciona **`angelucv/seguros-la-fe-bi`** (o el fork que uses).

2. **Configuración del servicio**  
   - **Root directory:** deja la raíz del repo (donde está `package.json` y `Dockerfile`).  
   - Railway detecta `railway.toml` y usará el **Dockerfile** como builder (`builder = "DOCKERFILE"`).  
   - **Start command:** ya está definido en `railway.toml` como `npm start` (coincide con el `CMD` del Dockerfile).

3. **Variables de entorno (opcional)**  
   En **Settings → Variables** del servicio:  
   - No hace falta definir `PORT`: Railway la inyecta sola.  
   - No hace falta `NODE_ENV` para el arranque: `npm start` ya la fija en `production`.  
   - **`DATA_DIR`:** solo si montas un **volumen** con CSV en otra ruta; si no, la app usa `data/public` incluida en la imagen.

4. **Despliegue**  
   Haz **Deploy** (o conecta la rama `main` para despliegues automáticos en cada push).  
   Espera a que el build termine (instala dependencias, `npm run build`, prune).  
   Abre la **URL pública** que asigna Railway (Settings → Networking → Generate domain).

5. **Comprobar**  
   - `https://TU-DOMINIO.railway.app/api/health` debe responder JSON con `"ok": true`.  
   - La raíz debe cargar el BI (SPA desde `dist/`).

### Si el deploy falla o el healthcheck no pasa

- Revisa **Build logs** y **Deploy logs** en Railway.  
- El healthcheck espera hasta **120 s** (`railway.toml`); el primer arranque puede tardar si los CSV son grandes.  
- Si cambias el puerto interno, Railway sigue inyectando `PORT`; el servidor ya escucha en `0.0.0.0`.

### Datos (CSV)

Los CSV van en **`data/public/`** y se copian en la imagen Docker. Para actualizar datos **sin** rebuild: monta un volumen y define **`DATA_DIR`** apuntando a esa carpeta.

## Otros hosts (Render, VPS, etc.)

1. Clonar el repo, `npm install`, `npm run build`, `npm start`.  
2. Variables: `NODE_ENV=production`, `PORT` según el host.
