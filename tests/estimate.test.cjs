'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function overlayCalc(puntoW, filaH) {
  return {
    puntos: Math.max(1, Math.round(100 / puntoW)),
    filas: Math.max(1, Math.round(100 / filaH)),
  };
}

describe('overlay stitch estimate (ak-mejoras.js)', () => {
  it('keeps the documented formula: round(100 / marked size), at least 1', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'ak-mejoras.js'),
      'utf8',
    );
    assert.match(
      src,
      /Math\.max\(1, Math\.round\(100 \/ state\.puntoW\)\)/,
    );
    assert.match(
      src,
      /Math\.max\(1, Math\.round\(100 \/ state\.filaH\)\)/,
    );
    assert.deepEqual(overlayCalc(8, 8), { puntos: 13, filas: 13 });
    assert.deepEqual(overlayCalc(100, 50), { puntos: 1, filas: 2 });
    assert.deepEqual(overlayCalc(2, 2), { puntos: 50, filas: 50 });
  });

  it('does not claim photos never leave the device', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'ak-mejoras.js'),
      'utf8',
    );
    assert.equal(src.includes('Nada sale de tu aparato'), false);
    assert.match(src, /se envía a Google/);
    assert.match(src, /Por defecto el cálculo es local/);
  });
});
