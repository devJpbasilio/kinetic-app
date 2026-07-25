import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextWorkout } from '../src/utils/nextWorkout';
import type { Workout, WorkoutLog } from '../src/types';

// Rotação de treinos: ao encerrar um treino, a tela Início deve sugerir o
// PRÓXIMO da sequência (bug relatado: ficava travado no primeiro treino).

const wk = (id: string, name: string): Workout => ({
  id, name, user_id: 'u1', created_at: '2026-01-01',
});

// Ordem de criação = ordem da rotação.
const workouts: Workout[] = [
  wk('w-peito', 'Peito, Ombro e Tríceps'),
  wk('w-costas', 'Costas e Bíceps'),
  wk('w-perna', 'Pernas'),
];

const logFor = (workout_id: string, date: string): WorkoutLog => ({
  id: 'log-' + workout_id + '-' + date, user_id: 'u1', workout_id,
  workout_name: '', date, duration: 60, calories: 450, notes: '',
  created_at: date,
});

test('sem histórico → sugere o primeiro treino', () => {
  assert.equal(getNextWorkout(workouts, [])?.id, 'w-peito');
});

test('após encerrar o 1º treino → sugere o 2º (o bug relatado)', () => {
  const logs = [logFor('w-peito', '2026-07-21')];
  assert.equal(getNextWorkout(workouts, logs)?.id, 'w-costas');
});

test('após encerrar o 2º treino → sugere o 3º', () => {
  const logs = [logFor('w-costas', '2026-07-21')];
  assert.equal(getNextWorkout(workouts, logs)?.id, 'w-perna');
});

test('após encerrar o último → volta ao primeiro (rotação cíclica)', () => {
  const logs = [logFor('w-perna', '2026-07-21')];
  assert.equal(getNextWorkout(workouts, logs)?.id, 'w-peito');
});

test('usa o log mais recente (logs vêm ordenados do mais novo p/ o mais antigo)', () => {
  const logs = [
    logFor('w-costas', '2026-07-21'), // mais recente
    logFor('w-peito', '2026-07-20'),
  ];
  assert.equal(getNextWorkout(workouts, logs)?.id, 'w-perna');
});

test('ignora logs de treinos já excluídos', () => {
  const logs = [
    logFor('w-antigo-excluido', '2026-07-21'), // não existe mais em workouts
    logFor('w-peito', '2026-07-20'),
  ];
  // Deve cair no log válido mais recente (w-peito) e sugerir o seguinte.
  assert.equal(getNextWorkout(workouts, logs)?.id, 'w-costas');
});

test('sem treinos cadastrados → null', () => {
  assert.equal(getNextWorkout([], []), null);
});
