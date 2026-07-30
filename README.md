# AburriaKnittler

App interactiva que procesa imágenes de tejidos para estimar puntos y filas, con interfaz accesible y contador de vueltas que funciona sin conexión.

## Stack

- **Vite + React + TypeScript** — SPA instalable (PWA)
- **Netlify** — hosting, Functions y AI Gateway
- **Gemini `gemini-2.5-flash`** — análisis visual de fotos de tejido
- **localStorage + service worker** — contador y shell offline

## Características (MVP)

1. **Analizar** — sube una foto y recibe una estimación de puntos, filas, tipo de puntada y estructura del patrón.
2. **Contador de vueltas** — +1 / −1 / reiniciar; se guarda en el dispositivo.
3. **Accesibilidad** — botones grandes, alto contraste tipográfico y foco visible.
4. **Offline** — la app y el contador siguen disponibles sin red; el análisis avisa si no hay conexión.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre la URL que muestre Vite (por defecto `http://localhost:5173`).

### Análisis con IA

Netlify AI Gateway solo inyecta claves tras **al menos un deploy de producción** y con AI Features activado en el sitio. Hasta entonces, `/api/analyze` puede responder que la IA no está disponible.

1. Enlaza el repo a Netlify y despliega.
2. Activa AI en el panel de Netlify.
3. Vuelve a probar el flujo Analizar (en producción o con `npm run dev` tras el deploy).

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Desarrollo con plugin de Netlify |
| `npm run build` | Build de producción |
| `npm run preview` | Vista previa del build |

## Estructura

- `src/pages/` — Home, Analizar, Contador
- `netlify/functions/analyze.ts` — `POST /api/analyze`
- `netlify.toml` — build y fallback SPA
