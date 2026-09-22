# AburriaKnittler

App interactiva que procesa imágenes de tejidos para estimar puntos y filas, con interfaz accesible y contador de vueltas que funciona sin conexión.

**Sitio en GitHub Pages:** https://oscarkleinkopf.github.io/AburriaKnittler/

---

## Flujo de GitHub (respaldo + Pages)

| Rama | Rol |
| --- | --- |
| **`source`** | Código completo. **Aquí se trabaja y se respalda.** |
| **`main`** | Solo el build estático. **GitHub Pages publica desde aquí.** |

```text
editas código → push a source → GitHub Actions construye → actualiza main → Pages
```

### Configuración de Pages (una vez)

1. Repo → **Settings → Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main` / folder `/` (root)
4. Guarda

No hace falta cambiar esto en cada deploy: Actions ya publica el build en `main`.

### Cómo publicar un cambio

```bash
git checkout source
# ... cambios ...
git add -A
git commit -m "Tu mensaje"
git push origin source
```

Luego mira **Actions → Deploy to GitHub Pages**. Cuando termine en verde, recarga el sitio (a veces hace falta Ctrl+Shift+R).

También puedes lanzar el workflow a mano: **Actions → Deploy to GitHub Pages → Run workflow**.

### Clave de Gemini (visión IA)

El análisis de fotos usa Gemini. En GitHub Pages **no hay servidor**: una clave `VITE_` queda dentro del JavaScript.

- **Recomendado:** en **Analizar**, pega tu clave (Google AI Studio). Se guarda solo en este aparato, no en el respaldo del proyecto.
- **Opcional en el repo:** **Settings → Secrets and variables → Actions →** `VITE_GEMINI_API_KEY` — sirve para tu sitio, pero es pública en el build.

Sin clave, la foto estima por el tamaño de la imagen (poco preciso).

### Sitio público en Netlify (dominio .cl)

GitHub Pages sigue igual. Para un dominio propio (cuando lo elijas) y **visión IA sin poner la clave en el JavaScript**, conecta este repo a Netlify. La rama a publicar es **`source`** (no `main`: `main` solo tiene el estático de Pages).

1. En [Netlify](https://app.netlify.com): **Add new site → Import an existing project → GitHub** → este repo.
2. Branch: **`source`**. Build y publish los toma de `netlify.toml` (`npm run build`, carpeta `dist`, base `/`).
3. Primer deploy de **producción**. Luego **Site configuration → AI** (o el interruptor de AI Features) y **actívalo**. El AI Gateway no funciona hasta ese primer deploy.
4. **No** pongas `VITE_GEMINI_API_KEY` ni `GEMINI_API_KEY` en las variables de Netlify. La función `/api/analizar` usa el gateway; si pones tu propia clave de Google, se salta el proxy.
5. Cuando tengas el dominio `.cl`: **Domain management → Add a domain** y sigue las instrucciones de DNS (registro en nic.cl / tu registrador). El código ya está listo; no hace falta otro deploy solo por el nombre.

Local con la función: `npm run dev` (base `/` y `VITE_ANALYZE_API=/api/analizar`). Hasta que el sitio de Netlify tenga un deploy de producción, el gateway local puede responder que falta la IA; en ese caso puedes pegar una clave en **Analizar** (queda en el aparato).

---

## Desarrollo local

```bash
git clone https://github.com/oscarkleinkopf/AburriaKnittler.git
cd AburriaKnittler
git checkout source
npm install
npm run dev
```

Probar el build como en Pages:

```bash
npm run build:pages
npm run preview
```

Abre la URL de preview bajo `/AburriaKnittler/`.

## Stack

- Vite + React + TypeScript (PWA)
- GitHub Pages (`main` = estático, `source` = código)
- Netlify (opcional): SPA en la raíz + función `/api/analizar` con AI Gateway
- Gemini: en Netlify va por el servidor; en Pages, clave en el aparato o `VITE_GEMINI_API_KEY` en el build

## Características

1. **Proyectos** — varios tejidos; buscar; filtros (en curso, con patrón, con foto, con meta); archivar; duplicar (otra talla) conserva patrón y fotos (hasta 4); elegir cuál foto es la portada
2. **Respaldo** — exportar / importar JSON; aviso si hace tiempo o el aparato va lleno; importar un patrón suelto crea un proyecto nuevo
3. **Patrón por filas** — instrucciones por fila; buscar en el patrón; duplicar un paso; marcar una fila (aviso en el contador); pegar o exportar texto; repetir un tramo; reordenar (Subir/Bajar); repeticiones dentro de la fila; resalta la vuelta actual; muestra/tensión; equivalencia de agujas (mm ↔ US); calculadora (montar puntos o filas; metros de lana; aumentos o disminuciones con M1, lazada, kfb, 2 juntos o SSK); leer en voz alta; imprimir; compartir solo el patrón (sin fotos ni contador)
4. **Sesiones** — temporizador; si lleva horas, pregunta si sigue; historial por día; estima el tiempo que queda según tu ritmo (meta o último paso del patrón)
5. **Retomar** — al abrir, si ayer estabas tejiendo, entra en el contador; recuerda la vuelta, la meta, el recado de «dónde lo dejé» y el siguiente paso
6. **Alto contraste** — botón Aa → Contraste
7. **Modo oscuro** — sigue el sistema hasta que elijas Oscuro/Claro
8. **Atajos del contador** — mantener pulsado: ±5 y luego ±10; deshacer el último toque
9. **Compartir proyecto** — un JSON suelto (o hoja de compartir del sistema)
10. **Analizar** — foto → rotar/recortar → estimación con Gemini (en Netlify por `/api/analizar`; en Pages si hay clave en el aparato o de build); sin IA avisa que es flojo y manda a escribir a mano; corregir; pasar al contador, a la meta o al patrón; añade la foto a la galería del proyecto; voz alta
11. **Contador** — vueltas + puntos, segunda pieza (manga…), meta (aviso al llegar, con deshacer), marcadores con nombre, pitido suave, leer el paso al completar la vuelta, pantalla completa; al sumar una vuelta marca sola la instrucción de esa fila (deshacer la restaura); repeticiones en el paso; aviso de derecho/revés; candado contra toques accidentales; foto de portada a la vista; la pantalla no se apaga al tejer
12. **Accesible** — Aa (letra, oscuro, contraste), botones grandes, márgenes seguros
13. **PWA** — instalable; guía «Añadir a inicio» en la home

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desarrollo (base `/`, llama a `/api/analizar` si el plugin de Netlify está activo) |
| `npm run build:pages` | Build con base `/AburriaKnittler/` + `404.html` |
| `npm run preview` | Vista previa del build |
| `npm run test` | Tests del respaldo, patrón, pantallas y tamaño de letra |
| `npm run lint` | Lint |
