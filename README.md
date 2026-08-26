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

### Secreto opcional (IA)

**Settings → Secrets and variables → Actions →** `VITE_GEMINI_API_KEY`  
Sin clave, el análisis usa modo local en el dispositivo.

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
- Gemini opcional (`VITE_GEMINI_API_KEY`)

## Características

1. **Proyectos** — varios tejidos; buscar; filtros (en curso, con patrón, con foto, con meta); archivar; duplicar (otra talla) conserva patrón y fotos (hasta 4); elegir cuál foto es la portada
2. **Respaldo** — exportar / importar JSON; aviso si hace tiempo o el aparato va lleno; importar un patrón suelto crea un proyecto nuevo
3. **Patrón por filas** — instrucciones por fila; pegar o exportar texto; repetir un tramo; reordenar (Subir/Bajar); repeticiones dentro de la fila; resalta la vuelta actual; muestra/tensión; calculadora (montar puntos o filas desde la muestra; repartir aumentos o disminuciones en una vuelta); leer en voz alta; imprimir; compartir solo el patrón (sin fotos ni contador)
4. **Sesiones** — temporizador; si lleva horas, pregunta si sigue; historial por día
5. **Retomar** — al abrir, si ayer estabas tejiendo, entra en el contador; recuerda la vuelta, la meta, el recado de «dónde lo dejé» y el siguiente paso
6. **Alto contraste** — botón Aa → Contraste
7. **Modo oscuro** — sigue el sistema hasta que elijas Oscuro/Claro
8. **Atajos del contador** — mantener pulsado: ±5 y luego ±10; deshacer el último toque
9. **Compartir proyecto** — un JSON suelto (o hoja de compartir del sistema)
10. **Analizar** — foto → rotar/recortar → estimación; sin IA avisa que es flojo y manda a escribir a mano; corregir; pasar al contador, a la meta o al patrón; añade la foto a la galería del proyecto; voz alta
11. **Contador** — vueltas + puntos, segunda pieza (manga…), meta (aviso al llegar, con deshacer), marcadores con nombre, pitido suave, leer el paso al completar la vuelta, pantalla completa; al sumar una vuelta marca sola la instrucción de esa fila (deshacer la restaura); repeticiones en el paso; aviso de derecho/revés; candado contra toques accidentales; foto de portada a la vista; la pantalla no se apaga al tejer
12. **Accesible** — Aa (letra, oscuro, contraste), botones grandes, márgenes seguros
13. **PWA** — instalable; guía «Añadir a inicio» en la home

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desarrollo (base `/`) |
| `npm run build:pages` | Build con base `/AburriaKnittler/` + `404.html` |
| `npm run preview` | Vista previa del build |
| `npm run test` | Tests del respaldo, patrón, pantallas y tamaño de letra |
| `npm run lint` | Lint |
