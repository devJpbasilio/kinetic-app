import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginLockDurationMs } from '../src/db';

// A função de backoff é pura e determinística — testável sem banco.

test('sem bloqueio antes do limite (< 5 falhas)', () => {
  for (let n = 0; n < 5; n++) {
    assert.equal(loginLockDurationMs(n), 0, `falha ${n} não deve bloquear`);
  }
});

test('bloqueio progressivo a partir da 5ª falha (backoff exponencial)', () => {
  assert.equal(loginLockDurationMs(5), 30_000);   // 30s
  assert.equal(loginLockDurationMs(6), 60_000);   // 1min
  assert.equal(loginLockDurationMs(7), 120_000);  // 2min
  assert.equal(loginLockDurationMs(8), 240_000);  // 4min
  assert.equal(loginLockDurationMs(9), 480_000);  // 8min
  assert.equal(loginLockDurationMs(10), 960_000); // 16min
});

test('respeita o teto de 30min', () => {
  assert.equal(loginLockDurationMs(11), 30 * 60_000); // 32min → cap 30min
  assert.equal(loginLockDurationMs(50), 30 * 60_000); // muito acima → cap 30min
});

test('é monotônica (nunca diminui ao acumular falhas)', () => {
  let prev = -1;
  for (let n = 0; n <= 40; n++) {
    const d = loginLockDurationMs(n);
    assert.ok(d >= prev, `duração não pode cair em n=${n}`);
    prev = d;
  }
});
