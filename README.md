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

1. **Proyectos** — varios tejidos; duplicar (otra talla) conserva patrón y foto
2. **Respaldo** — exportar / importar JSON; aviso si hace tiempo o el aparato va lleno
3. **Patrón por filas** — instrucciones por fila; editar, ocultar hechas, marcar desde el contador
4. **Sesiones** — temporizador, tiempo de hoy/total, historial por día (inicio–fin)
5. **Retomar** — al abrir, recuerda la vuelta y el siguiente paso
6. **Alto contraste** — botón Contraste en la cabecera
7. **Modo oscuro** — sigue el sistema hasta que elijas Oscuro/Claro
8. **Atajos del contador** — mantener pulsado: ±5 y luego ±10; deshacer el último toque
9. **Compartir proyecto** — un JSON suelto (o hoja de compartir del sistema)
10. **Analizar** — foto → rotar/recortar → estimación; corregir a mano; pasar al contador; voz alta
11. **Contador** — vueltas + puntos, marcador, pantalla completa; la pantalla no se apaga al tejer
12. **Accesible** — botones grandes, A−/A+, alto contraste, modo oscuro
13. **PWA** — instalable; guía «Añadir a inicio» en la home

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desarrollo (base `/`) |
| `npm run build:pages` | Build con base `/AburriaKnittler/` + `404.html` |
| `npm run preview` | Vista previa del build |
| `npm run test` | Tests del respaldo, patrón y tamaño de letra |
| `npm run lint` | Lint |
