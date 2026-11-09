/* AburriaKnittler — guarda la clave de Gemini fuera de la URL. */
'use strict';

function rewriteGeminiFetchArgs(input, init) {
  var urlString;
  if (typeof input === 'string') {
    urlString = input;
  } else if (input && typeof input.url === 'string') {
    urlString = input.url;
  } else {
    return { input: input, init: init, rewritten: false };
  }

  if (urlString.indexOf('generativelanguage.googleapis.com') === -1) {
    return { input: input, init: init, rewritten: false };
  }

  var parsed;
  try {
    parsed = new URL(urlString, 'https://generativelanguage.googleapis.com');
  } catch (err) {
    return { input: input, init: init, rewritten: false };
  }

  var key = parsed.searchParams.get('key');
  if (!key) {
    return { input: input, init: init, rewritten: false };
  }

  parsed.searchParams.delete('key');

  var headers;
  if (typeof Headers === 'function') {
    if (init && init.headers) {
      headers = new Headers(init.headers);
    } else if (typeof Request === 'function' && input instanceof Request) {
      headers = new Headers(input.headers);
    } else {
      headers = new Headers();
    }
    if (!headers.has('x-goog-api-key')) {
      headers.set('x-goog-api-key', key);
    }
  } else {
    headers = Object.assign({}, (init && init.headers) || {});
    if (!headers['x-goog-api-key'] && !headers['X-Goog-Api-Key']) {
      headers['x-goog-api-key'] = key;
    }
  }

  var nextInit = {};
  if (init) {
    Object.keys(init).forEach(function (k) {
      if (k !== 'headers') nextInit[k] = init[k];
    });
  }
  nextInit.headers = headers;

  return { input: parsed.toString(), init: nextInit, rewritten: true };
}

function wrapFetch(originalFetch) {
  return function patchedFetch(input, init) {
    var out = rewriteGeminiFetchArgs(input, init);
    return originalFetch.call(this, out.input, out.init);
  };
}

function installGeminiKeyGuard(globalObj) {
  var g = globalObj || (typeof globalThis !== 'undefined' ? globalThis : null);
  if (!g || typeof g.fetch !== 'function') return false;
  if (g.fetch.__akGeminiKeyGuard) return false;
  var wrapped = wrapFetch(g.fetch);
  wrapped.__akGeminiKeyGuard = true;
  g.fetch = wrapped;
  return true;
}

if (typeof window !== 'undefined') {
  installGeminiKeyGuard(window);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    rewriteGeminiFetchArgs: rewriteGeminiFetchArgs,
    wrapFetch: wrapFetch,
    installGeminiKeyGuard: installGeminiKeyGuard,
  };
}
