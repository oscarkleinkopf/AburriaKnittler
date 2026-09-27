/* AburriaKnittler — capa de mejoras (sin fuente): auto primero, corrección por toques, contador manos libres. */
(function () {
  'use strict';
  var LS_EST = 'ak-estimacion-v1';
  var state = { imgURL: null, imgName: '', puntoW: 8, filaH: 8, vozOn: false, rec: null, wake: null };
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function path() { return location.pathname.replace(/\/$/, ''); }
  function onAnalizar() { return /\/analizar$/.test(path()) || /analizar/i.test(document.body.innerText.slice(0, 400) + ' ' + location.href) && !!$('input[type="file"][accept*="image"]'); }
  function onContador() { return /\/contador$/.test(path()) || !!$('.counter-btn--plus'); }

  function announce(msg) {
    var live = $('#ak-live');
    if (!live) { live = document.createElement('p'); live.id = 'ak-live'; live.className = 'ak-live'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
    live.textContent = msg;
  }

  function fixLogo() {
    var logo = $('img.shell__logo');
    if (logo && !logo.alt) { logo.alt = 'AburriaKnittler — inicio'; }
  }

  /* ---------- ANALIZAR ---------- */
  function calc() {
    var p = Math.max(1, Math.round(100 / state.puntoW));
    var f = Math.max(1, Math.round(100 / state.filaH));
    return { puntos: p, filas: f };
  }
  function renderMarca() {
    var box = $('#ak-caja'); if (!box) return;
    box.style.left = (50 - state.puntoW / 2) + '%';
    box.style.width = state.puntoW + '%';
    box.style.top = (38 - state.filaH / 2) + '%';
    box.style.height = state.filaH + '%';
    var vw = $('#ak-v-punto'); if (vw) vw.textContent = state.puntoW.toFixed(0) + '%';
    var vh = $('#ak-v-fila'); if (vh) vh.textContent = state.filaH.toFixed(0) + '%';
    var r = calc();
    var out = $('#ak-result'); if (out) out.innerHTML = '≈ <strong>' + r.puntos + ' puntos</strong> × <strong>' + r.filas + ' filas</strong> — sin contar uno por uno.';
  }
  function saveEst() {
    try {
      var r = calc();
      localStorage.setItem(LS_EST, JSON.stringify({ puntos: r.puntos, filas: r.filas, fecha: new Date().toISOString() }));
      announce('Estimación guardada: ' + r.puntos + ' puntos por ' + r.filas + ' filas.');
    } catch (e) {}
  }
  function enhanceAnalizar() {
    var file = $('input[type="file"][accept*="image"]');
    if (!file) return;
    var main = file.closest('main') || document.body;
    fixLogo();

    if (!$('#ak-guia')) {
      var g = document.createElement('section');
      g.id = 'ak-guia'; g.className = 'ak-guia'; g.setAttribute('aria-label', 'Cómo funciona: la app cuenta por ti');
      g.innerHTML = '<h2>La app cuenta por ti 🧶</h2><ol>' +
        '<li><strong>Paso 1 — Foto:</strong> solo el tejido, con luz, de frente.</li>' +
        '<li><strong>Paso 2 — Marca 1 punto:</strong> ajusta el recuadro a <em>un solo punto</em> y <em>una sola fila</em> con los botones + / −.</li>' +
        '<li><strong>Paso 3 — Listo:</strong> la app estima puntos y filas. Tú no cuentas.</li></ol>' +
        '<p class="ak-mini">Si la foto es solo tejido, el cálculo es mejor. Moneda o regla al lado ayudan.</p>';
      main.insertBefore(g, main.firstChild);
    }

    if (!$('#ak-foto')) {
      var wrap = document.createElement('div');
      wrap.id = 'ak-foto'; wrap.className = 'ak-foto';
      wrap.innerHTML = '<button type="button" class="ak-foto__btn" id="ak-foto-btn">📷 Sacar / elegir foto del tejido</button>' +
        '<span class="ak-foto__nombre" id="ak-foto-nombre">Sin foto aún — la app cuenta por ti.</span>' +
        '<div id="ak-prev-slot"></div>' +
        '<p class="ak-mini">Formatos de imagen. Nada sale de tu aparato salvo que lo compartas.</p>';
      file.parentNode.insertBefore(wrap, file);
      wrap.appendChild(file);
      $('#ak-foto-btn').addEventListener('click', function () { file.click(); });
    }
    var nombre = $('#ak-foto-nombre');
    if (nombre && state.imgName) nombre.textContent = '✓ ' + state.imgName;

    // Demote manual: nota en vez de mover nodos React
    if (!$('.ak-manual-note')) {
      var escribes = $all('button').filter(function (b) { return /escribir/i.test(b.textContent); });
      if (escribes.length) {
        var n = document.createElement('p');
        n.className = 'ak-manual-note';
        n.innerHTML = '<strong>¿Prefieres no tocar nada?</strong> Sube la foto y ajusta 1 punto arriba. Lo de abajo es <em>corrección opcional</em>, no necesitas contar.';
        escribes[0].parentNode.insertBefore(n, escribes[0]);
      }
    }

    if (!file.dataset.akBound) {
      file.dataset.akBound = '1';
      file.setAttribute('aria-label', 'Foto del tejido. La aplicación estima los puntos, no necesitas contarlos.');
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        state.imgName = f.name + ' (' + Math.round(f.size / 1024) + ' KB)';
        if (nombre) nombre.textContent = '✓ ' + state.imgName;
        var rd = new FileReader();
        rd.onload = function () { state.imgURL = rd.result; paintPreview(); };
        rd.readAsDataURL(f);
      });
    }
    if (state.imgURL) paintPreview();
  }

  function paintPreview() {
    var slot = $('#ak-prev-slot'); if (!slot) return;
    if ($('#ak-prev')) { renderMarca(); return; }
    var d = document.createElement('div');
    d.id = 'ak-prev'; d.className = 'ak-prev';
    d.innerHTML = '<img id="ak-img" alt="Vista previa del tejido para marcar un punto de ejemplo">' +
      '<div class="ak-marca" aria-hidden="true"><div class="ak-marca__caja" id="ak-caja"></div></div>' +
      '<div class="ak-ctrl">' +
      '<div class="ak-ctrl__fila"><label id="ak-l1">Ancho de 1 punto</label>' +
      '<span class="ak-ctrl__val" id="ak-v-punto"></span>' +
      '<button type="button" class="ak-btn" id="ak-w-menos" aria-label="Punto más estrecho">−</button>' +
      '<button type="button" class="ak-btn" id="ak-w-mas" aria-label="Punto más ancho">+</button></div>' +
      '<div class="ak-ctrl__fila"><label id="ak-l2">Alto de 1 fila</label>' +
      '<span class="ak-ctrl__val" id="ak-v-fila"></span>' +
      '<button type="button" class="ak-btn" id="ak-h-menos" aria-label="Fila más baja">−</button>' +
      '<button type="button" class="ak-btn" id="ak-h-mas" aria-label="Fila más alta">+</button></div>' +
      '</div>' +
      '<p class="ak-result" id="ak-result" role="status"></p>' +
      '<div class="ak-acciones"><button type="button" class="ak-btn ak-btn--primary" id="ak-usar">Usar como muestra →</button></div>' +
      '<p class="ak-nota">Ajusta hasta que el recuadro cubra exactamente 1 “V” del punto. No cuentes el resto.</p>';
    slot.appendChild(d);
    $('#ak-img').src = state.imgURL;
    function step(which, delta) {
      if (which === 'w') state.puntoW = Math.min(30, Math.max(2, +(state.puntoW + delta).toFixed(1)));
      else state.filaH = Math.min(30, Math.max(2, +(state.filaH + delta).toFixed(1)));
      renderMarca();
    }
    $('#ak-w-mas').onclick = function () { step('w', 1); };
    $('#ak-w-menos').onclick = function () { step('w', -1); };
    $('#ak-h-mas').onclick = function () { step('h', 1); };
    $('#ak-h-menos').onclick = function () { step('h', -1); };
    $('#ak-usar').onclick = function () {
      saveEst();
      location.assign('/AburriaKnittler/patron');
    };
    renderMarca();
  }

  /* ---------- CONTADOR manos libres ---------- */
  function clickBtn(rx) {
    var b = $all('button').filter(function (x) { return rx.test(x.textContent + ' ' + (x.getAttribute('aria-label') || '')); })[0];
    if (b && !b.disabled) { b.click(); return true; }
    return false;
  }
  function enhanceContador() {
    fixLogo();
    if (!$('#ak-voz')) {
      var host = $('.counter-display__fullscreen-btn') || $all('button').filter(function (b) { return /atajos/i.test(b.textContent); })[0];
      if (host && host.parentNode) {
        var v = document.createElement('button');
        v.type = 'button'; v.id = 'ak-voz'; v.className = 'ak-voz'; v.dataset.on = '0';
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { v.disabled = true; v.textContent = '🎙 Voz no disponible en este navegador'; }
        else {
          v.textContent = '🎙 Voz: apagada — di “siguiente” con las manos ocupadas';
          v.addEventListener('click', function () {
            if (state.rec) { try { state.rec.stop(); } catch (e) {} state.rec = null; state.vozOn = false; v.dataset.on = '0'; v.textContent = '🎙 Voz: apagada — di “siguiente” con las manos ocupadas'; announce('Voz apagada'); return; }
            var rec = new SR(); rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = false;
            rec.onresult = function (ev) {
              var t = ev.results[ev.results.length - 1][0].transcript.toLowerCase();
              if (/siguiente|suma|más|mas|una más|punto siguiente/.test(t)) { if (clickBtn(/sumar vuelta/i)) announce('Vuelta sumada'); }
              else if (/atr[aá]s|resta|menos/.test(t)) { if (clickBtn(/restar vuelta/i)) announce('Vuelta restada'); }
              else if (/deshacer/.test(t)) { if (clickBtn(/deshacer/i)) announce('Deshecho'); }
              else if (/leer|donde|dónde/.test(t)) { clickBtn(/leer paso|voz alta|s\b/i); }
            };
            rec.onend = function () { if (state.vozOn) { try { rec.start(); } catch (e) {} } };
            try { rec.start(); state.rec = rec; state.vozOn = true; v.dataset.on = '1'; v.textContent = '🎙 Voz: encendida — “siguiente” suma, “atrás” resta'; announce('Voz encendida'); } catch (e) {}
          });
        }
        host.parentNode.insertBefore(v, host.nextSibling);
      }
    }
    // Wake lock al iniciar sesión de tejido
    var ini = $all('button').filter(function (b) { return /iniciar sesi/i.test(b.textContent); })[0];
    if (ini && !ini.dataset.akWake) {
      ini.dataset.akWake = '1';
      ini.addEventListener('click', function () {
        try {
          if ('wakeLock' in navigator) { navigator.wakeLock.request('screen').then(function (s) { state.wake = s; }).catch(function () {}); }
        } catch (e) {}
      });
    }
  }

  var scheduled = false;
  function apply() {
    scheduled = false;
    try {
      if ($('input[type="file"][accept*="image"]')) enhanceAnalizar();
      else if (onAnalizar()) enhanceAnalizar();
      if ($('.counter-btn--plus') || onContador()) enhanceContador();
      fixLogo();
    } catch (e) {}
  }
  function schedule() { if (!scheduled) { scheduled = true; setTimeout(apply, 120); } }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  ['pushState', 'replaceState'].forEach(function (k) {
    try {
      var orig = history[k];
      history[k] = function () { var r = orig.apply(this, arguments); schedule(); return r; };
    } catch (e) {}
  });
  document.addEventListener('DOMContentLoaded', apply);
  apply();
})();
