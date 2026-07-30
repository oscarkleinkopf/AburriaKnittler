# AburriaKnittler

App interactiva que procesa imágenes de tejidos para estimar puntos y filas, con interfaz accesible y contador de vueltas que funciona sin conexión.

**Demo:** https://oscarkleinkopf.github.io/AburriaKnittler/

## Stack

- **Vite + React + TypeScript** — SPA instalable (PWA)
- **GitHub Pages** — hosting estático
- **Gemini (opcional)** — análisis visual con `VITE_GEMINI_API_KEY`
- **localStorage + service worker** — contador y shell offline

## Características (MVP)

1. **Analizar** — sube una foto y recibe una estimación de puntos, filas, tipo de puntada y estructura.
2. **Contador de vueltas** — +1 / −1 / reiniciar; se guarda en el dispositivo.
3. **Accesibilidad** — botones grandes, alto contraste y tipografía legible.
4. **Offline** — la app y el contador siguen disponibles sin red.

Sin clave de Gemini, el análisis usa un **modo local** orientativo (sigue funcionando en Pages).

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173/` (base `/` en desarrollo).

Para probar el build como en Pages:

```bash
npm run build:pages
npm run preview
```

Luego abre la URL de preview bajo `/AburriaKnittler/`.

## Publicar en GitHub Pages

1. En el repo: **Settings → Pages → Source: GitHub Actions**.
2. Fusiona a `main` (o ejecuta el workflow **Deploy GitHub Pages**).
3. (Opcional) Añade el secreto de repositorio `VITE_GEMINI_API_KEY` para análisis con IA.
   - Restringe la clave por referrer HTTP a `https://oscarkleinkopf.github.io/*` en Google AI Studio.

La app queda en: `https://oscarkleinkopf.github.io/AburriaKnittler/`

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Desarrollo (base `/`) |
| `npm run build:pages` | Build para GitHub Pages |
| `npm run preview` | Vista previa del build |
| `npm run lint` | Lint |

## Estructura

- `src/pages/` — Home, Analizar, Contador
- `src/lib/analyze.ts` — Gemini o estimación local
- `.github/workflows/deploy-pages.yml` — deploy automático
