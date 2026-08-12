# AburriaKnittler

App interactiva que procesa imágenes de tejidos para estimar puntos y filas, con interfaz accesible y contador de vueltas que funciona sin conexión.

**Sitio:** https://oscarkleinkopf.github.io/AburriaKnittler/

## Cómo está publicado / respaldado

| Rama | Contenido |
| --- | --- |
| **`source`** | Código fuente completo (respaldo principal) |
| `cursor/proyectos-contador-09f1` | Rama de trabajo (proyectos + contador) |
| `cursor/aburriaknittler-mvp-09f1` | MVP inicial |
| **`main`** | Solo el build estático de GitHub Pages |

Al hacer push a `source` (o a las ramas `cursor/*` del workflow), Actions construye la app y actualiza `main`.

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
2. **Respaldo** — exportar / importar todos los proyectos en JSON
3. **Analizar** — foto → estimación de puntos/filas/puntada
4. **Contador** — vueltas + puntos, aviso cada N vueltas e historial
5. **Accesible** — botones grandes y alto contraste
6. **PWA** — instalable; shell + contador sin red
