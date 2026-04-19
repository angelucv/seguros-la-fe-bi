# ETL SUDEASEG (Seguros La Fe BI)

Descarga **cifras mensuales** desde el listado Apache de [SUDEASEG](https://www.sudeaseg.gob.ve/Descargas/Estadisticas/Cifras%20Mensuales/) y genera CSV en el mismo esquema que usa el BI (`primas_netas_mensual_largo.csv`, `indices_*`, `resultado_tecnico_*`, `bcv_ves_por_usd_mensual.csv`).

## Requisitos

- Node.js 20+

## Uso

```bash
npm install
```

1. **Descargar** todos los `.xlsx` de *Cifras mensuales* (Primas, Índices, Cuadro de resultados, Resumen por empresa, Series históricas) y de **Cifras anuales** (p. ej. `Archivos 2024/` con el Excel “Seguro en cifras”), incluyendo subcarpetas `Año 2025`, `Año 2026`, etc.:

```bash
npm run download
```

Los archivos quedan en `cache/downloads/`.

2. **Transformar** a CSV en `output/data/public/`:

```bash
npm run transform
```

O ambos pasos:

```bash
npm run all
```

## Salida

| Archivo | Origen |
|--------|--------|
| `primas_netas_mensual_largo.csv` | Excel *Primas netas cobradas por empresa* |
| `indices_por_empresa_historico_largo.csv` | *Índices por empresa* (todas las fechas deduplicadas) |
| `indices_por_empresa_mes_actual.csv` | Mismo dataset, filtrado al **último año-mes** presente en índices |
| `resultado_tecnico_saldo_mensual.csv` | *Cuadro de resultados* |
| `cuadro_29_indicadores_financieros_por_empresa.csv` | **Derivado**: cierre de **diciembre** de índices por empresa (mapeo a columnas del BI; `INDICE_UTILIDAD_PATRIMONIO` vacío salvo otra fuente). También `cuadro_29_indicadores_financieros_<AÑO>_por_empresa.csv`. |
| `cuadro_31A_primas_netas_cobradas_<Y>_vs_<Y-1>.csv` | **Derivado**: primas netas a **diciembre** año Y vs Y−1 y % crecimiento (solo si existen ambos cierres). |
| `bcv_ves_por_usd_mensual.csv` | Copia de `templates/bcv_ves_por_usd_mensual.csv` (no viene del regulador; actualízala con tu serie BCV) |

## Integración con el BI

Desde la **raíz del repo del BI** (`seguros-la-fe-bi`), `npm run data:transform` y `npm run data:all` copian automáticamente `etl/output/data/public/` a `data/public/`. Si solo transformó dentro de `etl/`, ejecute en la raíz: `npm run data:sync`.

## Notas

- Si un mismo mes aparece en un **archivo anual** (12 hojas) y en un **archivo mensual** de `Año YYYY/`, se prioriza el mensual.
- Los nombres de empresa se normalizan con la misma lógica de `peer_id` que el BI (`src/empresaPeerId.ts`), unificando variantes de **Seguros La Fe** en `fe c a seguros`.
- **Cuadro 29 / 31A** y otras tablas anuales no están en este pipeline; se pueden añadir parsers y rutas de descarga siguiendo el mismo patrón.
