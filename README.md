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

1. **Proyectos** — varios tejidos con nombre, notas, foto, contador y análisis
2. **Analizar** — foto → estimación de puntos/filas/puntada
3. **Contador** — vueltas + puntos, aviso cada N vueltas e historial
4. **Accesible** — botones grandes y alto contraste
5. **PWA** — instalable; shell + contador sin red

El código fuente de esta mejora está en `cursor/proyectos-contador-09f1`.
