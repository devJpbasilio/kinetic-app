// Testes do parse do tempo de descanso (src/utils/parseRestTime.ts).
// Antes da correção esta lógica vivia inline em ActiveWorkoutView e usava
// `parseInt(x) || default`, então 0 (falsy) virava o default: "00:30" → 90s.
// Rodar: npx tsx --test tests/*.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRestTime } from '../src/utils/parseRestTime';

const casos: Array<[string, number]> = [
  ['00:30', 30],
  ['01:00', 60],
  ['01:30', 90],
  ['02:00', 120],
  ['00:45', 45],
  ['2', 120],   // só minutos
];

for (const [entrada, esperado] of casos) {
  test(`descanso "${entrada}" = ${esperado}s`, () => {
    assert.equal(parseRestTime(entrada), esperado);
  });
}

test('entrada inválida cai no fallback explícito', () => {
  assert.equal(parseRestTime('abc'), 90);
  assert.equal(parseRestTime(''), 90);
  assert.equal(parseRestTime(undefined), 90);
  assert.equal(parseRestTime('00:00'), 90); // zero total → fallback, nunca 0s
});

test('fallback é configurável', () => {
  assert.equal(parseRestTime('lixo', 60), 60);
});
