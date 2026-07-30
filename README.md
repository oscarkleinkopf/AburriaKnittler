# AburriaKnittler

App interactiva que procesa imágenes de tejidos para estimar puntos y filas, con interfaz accesible y contador de vueltas que funciona sin conexión.

**Sitio:** https://oscarkleinkopf.github.io/AburriaKnittler/

## Cómo está publicado

GitHub Pages está configurado para servir la rama **`main`** (archivos estáticos del build).

El **código fuente** vive en la rama `cursor/aburriaknittler-mvp-09f1`. Al hacer push ahí, el workflow construye la app y actualiza `main`.

## Stack

- Vite + React + TypeScript (PWA)
- GitHub Pages
- Gemini opcional (`VITE_GEMINI_API_KEY`) o estimación local

## Desarrollo

```bash
npm install
npm run dev
```

Build como en producción:

```bash
npm run build:pages
npm run preview
```

## Características

1. **Analizar** — foto → estimación de puntos/filas/puntada
2. **Contador** — vueltas en `localStorage` (offline)
3. **Accesible** — botones grandes y alto contraste
4. **PWA** — instalable; shell + contador sin red
