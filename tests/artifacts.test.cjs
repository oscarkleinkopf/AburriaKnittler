'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('compiled Pages artifacts', () => {
  it('does not put the Gemini API key in the request URL', () => {
    const bundle = read('assets/index-DgNMmV4U.js');
    assert.equal(bundle.includes('generateContent?key='), false);
    assert.match(bundle, /["']x-goog-api-key["']\s*:/);
    assert.match(
      bundle,
      /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:generateContent/,
    );
  });

  it('does not tell visitors to paste or bake a Gemini key', () => {
    const bundle = read('assets/index-DgNMmV4U.js');
    assert.equal(bundle.includes('pegar una clave de Gemini'), false);
    assert.equal(bundle.includes('configura VITE_GEMINI_API_KEY'), false);
    assert.match(bundle, /envía la foto a Google/);
    assert.match(
      bundle,
      /El análisis visual con Gemini no está configurado en este sitio/,
    );
  });

  it('loads the fetch guard before the app bundle', () => {
    for (const file of ['index.html', '404.html']) {
      const html = read(file);
      const guard = html.indexOf('ak-security.js');
      const app = html.indexOf('assets/index-DgNMmV4U.js');
      assert.ok(guard >= 0, file + ' must include ak-security.js');
      assert.ok(app >= 0, file + ' must include the app bundle');
      assert.ok(guard < app, file + ' must load the guard first');
      assert.match(html, /name="referrer"\s+content="no-referrer"/);
    }
  });

  it('precaches the guard and bumps revisions so the service worker refreshes', () => {
    const sw = read('sw.js');
    assert.match(sw, /url:"ak-security.js"/);
    assert.match(sw, /url:"ak-mejoras.js",revision:"ak-sec-1"/);
    assert.match(sw, /url:"assets\/index-DgNMmV4U.js",revision:"ak-sec-1"/);
  });

  it('does not ship Google API keys or .env files in tracked static files', () => {
    const files = [
      'assets/index-DgNMmV4U.js',
      'ak-mejoras.js',
      'ak-security.js',
      'index.html',
      '404.html',
      'sw.js',
      'README.md',
    ];
    for (const rel of files) {
      const text = read(rel);
      assert.equal(
        /AIza[0-9A-Za-z_-]{20,}/.test(text),
        false,
        rel + ' must not contain a Google API key',
      );
    }
    assert.equal(fs.existsSync(path.join(root, '.env')), false);
    assert.equal(fs.existsSync(path.join(root, '.env.local')), false);
  });
});
