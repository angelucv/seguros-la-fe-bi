# Ficha de revisión interna — aplicativo `seguros-la-fe-bi`

**Fecha de registro:** 2026-04-20  
**Responsable:** Angel Colmenares (coordinación estadística / BI)  
**Estado:** En revisión interna (no comunicado a directiva)

## 1) Objetivo de la iniciativa

Disponer de un tablero web para visualizar, con enfoque ejecutivo, la posición de Seguros La Fe frente al mercado usando fuentes públicas (SUDEASEG) y tipo de cambio BCV cuando aplica.

## 2) Alcance funcional observado

- **BI Home**: portada ejecutiva con accesos a módulos, glosario y bloque de resultado técnico/PNC.
- **BI Sectorial**:
  - Tacómetros de indicadores de Seguros La Fe vs promedio sector.
  - Participación de mercado (donut) en USD.
  - Primas mensuales del grupo comparable.
  - Ranking y tablas de detalle de volumen/participación.
  - Pestañas de indicadores en cifras y evolución mensual.
- **BI Histórico**:
  - Serie mensual de primas (USD o Bs.) y participación.
  - Resumen del último cierre (ranking, acumulados y brecha vs líder).
  - Variación interanual diciembre vs diciembre.
  - Exportación de series visibles a CSV y gráficos a PNG.
- **BI Funerario**:
  - Evolución por año y participación del ramo funerario.
  - Vista en Bs. o USD (con BCV de diciembre).
  - Tabla por empresa con ranking y participación.
- **Fuentes**: módulo explicativo de procedencia de datos y notas de uso.

## 3) Fuentes y datos

- **SUDEASEG**: estadísticas públicas (cifras mensuales y anuales).
- **BCV**: tipo de cambio oficial para conversiones.
- **ETL propio** (`etl/`): descarga, transformación y publicación de CSV consumidos por el frontend/API.

## 4) Arquitectura técnica (alto nivel)

- Frontend: React + Vite + Tailwind.
- Backend/API: Express en el mismo proyecto.
- ETL separado en `etl/` con salida a `data/public`.
- Despliegue contemplado en Docker/Railway.

## 5) Valor potencial para el programa BI

- Acelera la lectura comparativa de mercado con visualizaciones ya estructuradas.
- Provee base para conversaciones ejecutivas sobre posicionamiento y tendencia.
- Puede reutilizarse como línea de referencia externa del programa BI interno.

## 6) Riesgos o límites identificados en esta fase

- Fuentes públicas pueden tener rezagos de publicación.
- Parte de las métricas depende de supuestos de transformación (ETL).
- No reemplaza indicadores operativos internos de cobranza/siniestros.
- Requiere validación metodológica antes de socialización formal.

## 7) Plan corto de revisión (W17)

1. Validar consistencia de métricas clave en muestras de periodos.
2. Revisar supuestos de conversión USD/Bs. y definiciones mostradas.
3. Documentar brechas entre este BI público y necesidades internas de dirección.
4. Preparar recomendación: presentar, ajustar o mantener en uso interno.

## 8) Criterio actual de comunicación

Se mantiene como **iniciativa de revisión interna** hasta cerrar la validación funcional y metodológica.  
**No comunicar a directiva** en esta etapa.
