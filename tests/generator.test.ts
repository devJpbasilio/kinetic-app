// Testes do motor de geração de treinos (src/generator).
// Rodar com: npx tsx --test tests/*.test.ts
//
// Os testes marcados como [BUG] reproduzem defeitos encontrados na auditoria
// e DEVEM FALHAR enquanto o bug existir. Após a correção, devem passar.
// Não altere os testes para fazê-los passar — corrija o motor.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '../src/generator/engine';
import { CURATED_EXERCISES } from '../src/generator/exercises';
import type { GeneratorPreferences, Regiao } from '../src/generator/types';

const base: GeneratorPreferences = {
  objetivo: 'hipertrofia',
  nivel: 'iniciante',
  dias: 3,
  tempo: 45,
  local: 'academia_completa',
};

// ---------------------------------------------------------------------------
// Invariantes que hoje passam (comportamento correto a preservar)
// ---------------------------------------------------------------------------

test('plano padrão gera todos os dias com exercícios', () => {
  const plan = generatePlan(base);
  assert.equal(plan.treinos.length, 3);
  for (const dia of plan.treinos) {
    assert.ok(dia.exercicios.length >= 4, `dia "${dia.nome}" tem só ${dia.exercicios.length} exercícios`);
  }
});

test('não repete exercício dentro do mesmo dia', () => {
  for (const nivel of ['iniciante', 'intermediario', 'avancado'] as const) {
    for (const local of ['academia_completa', 'academia_basica', 'casa'] as const) {
      const plan = generatePlan({ ...base, nivel, local, dias: 6, tempo: 90 });
      for (const dia of plan.treinos) {
        const slugs = dia.exercicios.map((e) => e.slug);
        assert.equal(new Set(slugs).size, slugs.length, `duplicado em "${dia.nome}" (${nivel}/${local})`);
      }
    }
  }
});

test('restrições (lesões) nunca aparecem no plano', () => {
  const restricoes: Regiao[] = ['costas', 'ombro'];
  const plan = generatePlan({ ...base, nivel: 'intermediario', dias: 4, restricoes });
  for (const dia of plan.treinos) {
    for (const e of dia.exercicios) {
      assert.ok(!restricoes.includes(e.regiao), `"${e.nome}" (${e.regiao}) viola restrição em "${dia.nome}"`);
    }
  }
});

test('respeita o teto de exercícios por tempo disponível', () => {
  const limites: Array<[30 | 45 | 60 | 90, number]> = [[30, 4], [45, 6], [60, 8], [90, 10]];
  for (const [tempo, max] of limites) {
    const plan = generatePlan({ ...base, nivel: 'avancado', dias: 6, tempo });
    for (const dia of plan.treinos) {
      assert.ok(dia.exercicios.length <= max, `"${dia.nome}" excede ${max} ex com tempo=${tempo}`);
    }
  }
});

test('emagrecimento sempre inclui nota de cardio', () => {
  const plan = generatePlan({ ...base, objetivo: 'emagrecimento' });
  for (const dia of plan.treinos) assert.ok(dia.cardio, `dia "${dia.nome}" sem cardio`);
});

// ---------------------------------------------------------------------------
// [BUG] Reproduções de defeitos encontrados na auditoria
// ---------------------------------------------------------------------------

test('[BUG-1] a base curada não tem exercícios de Elástico nem Kettlebell, mas a UI oferece os filtros', () => {
  const equipamentos = new Set(CURATED_EXERCISES.map((e) => e.equipamento));
  // A UI (WorkoutGeneratorView) e a API aceitam estes valores; a base precisa cobri-los
  assert.ok(equipamentos.has('Elástico'), 'nenhum exercício com Elástico na base curada');
  assert.ok(equipamentos.has('Kettlebell'), 'nenhum exercício com Kettlebell na base curada');
});

test('[BUG-2] filtro só-Elástico gera plano com dias 100% vazios (deveria avisar ou ter fallback)', () => {
  const plan = generatePlan({ ...base, local: 'casa', equipamentos: ['Elástico'] });
  for (const dia of plan.treinos) {
    assert.ok(dia.exercicios.length > 0, `dia "${dia.nome}" veio vazio — plano inútil é salvável sem aviso`);
  }
});

test('[BUG-3] fallback contamina o foco do dia (ex.: supino no treino de pernas)', () => {
  // Reprodução real: casa + avançado + 6 dias → dia "C — Pernas (Quadríceps)"
  // recebe "Supino Reto com Halteres" pelo fallback genérico do buildDay.
  const plan = generatePlan({ objetivo: 'hipertrofia', nivel: 'avancado', dias: 6, tempo: 90, local: 'casa' });
  const regioesPorFoco: Record<string, Regiao[]> = {
    'Pernas (Quadríceps)': ['quadriceps', 'panturrilha', 'posterior', 'gluteo', 'abdomen'],
  };
  for (const dia of plan.treinos) {
    const permitidas = regioesPorFoco[dia.foco];
    if (!permitidas) continue;
    for (const e of dia.exercicios) {
      assert.ok(
        permitidas.includes(e.regiao),
        `"${e.nome}" (região ${e.regiao}) não pertence ao foco "${dia.foco}" do dia "${dia.nome}"`
      );
    }
  }
});

test('[BUG-4] restringir todas as regiões produz plano vazio detectável (rejeitado com 422 na API)', () => {
  // Quando todos os grupos são restringidos, o motor não tem como escolher
  // exercícios — e não deve inventar nenhum. O contrato é: o motor devolve um
  // plano vazio e o endpoint /api/workouts/generate o rejeita com 422
  // (server.ts, checagem `totalExercicios === 0`). Aqui garantimos que o sinal
  // de "vazio" é fiel: total === 0, nunca um plano parcialmente contaminado.
  const todas: Regiao[] = ['peito', 'costas', 'ombro', 'biceps', 'triceps', 'quadriceps', 'posterior', 'gluteo', 'panturrilha', 'abdomen', 'trapezio'];
  const plan = generatePlan({ ...base, restricoes: todas });
  const totalEx = plan.treinos.reduce((n, d) => n + d.exercicios.length, 0);
  assert.equal(totalEx, 0, 'motor deveria devolver plano 100% vazio para a API rejeitar');
});
