// Motor de geração de treinos inteligentes.
// Função pura: recebe as preferências do usuário e devolve um plano completo,
// selecionando exercícios da base curada por metadados e preenchendo os slots
// das divisões (splits) conforme tempo, nível, objetivo e restrições.

import {
  CuratedExercise, GeneratorPreferences, GeneratedPlan, GeneratedDay, GeneratedExercise, Nivel, Objetivo,
} from './types';
import { CURATED_EXERCISES } from './exercises';
import { chooseSplit, DayBlueprint, Slot } from './splits';

// Número de exercícios de força por treino conforme o tempo disponível.
function maxExercicios(tempo: number): number {
  if (tempo <= 30) return 4;
  if (tempo <= 45) return 6;
  if (tempo <= 60) return 8;
  return 10;
}

function series(nivel: Nivel, composto: boolean): number {
  if (nivel === 'iniciante') return composto ? 3 : 2;
  return composto ? 4 : 3; // intermediário e avançado
}

function repeticoes(objetivo: Objetivo, composto: boolean): string {
  if (objetivo === 'hipertrofia') return composto ? '8 - 12' : '10 - 12';
  return composto ? '12 - 15' : '15'; // emagrecimento
}

function descanso(objetivo: Objetivo, composto: boolean): string {
  if (objetivo === 'hipertrofia') return composto ? '01:45' : '01:00';
  return composto ? '00:45' : '00:30'; // emagrecimento
}

function cardioNota(objetivo: Objetivo, nivel: Nivel): string | undefined {
  if (objetivo === 'emagrecimento') {
    if (nivel === 'iniciante') return 'Caminhada 20–30 min ao final do treino';
    if (nivel === 'intermediario') return 'HIIT 20 min ou bike moderada 20 min ao final';
    return 'HIIT 15 min ao final do treino';
  }
  if (nivel === 'iniciante') return 'Caminhada leve 15 min (opcional)';
  return undefined;
}

// Pool de exercícios disponível dado o local, nível, objetivo, equipamentos e restrições.
function buildPool(prefs: GeneratorPreferences): CuratedExercise[] {
  const restricoes = prefs.restricoes ?? [];
  const excluir = prefs.excluir ?? [];
  const equip = prefs.equipamentos ?? [];
  return CURATED_EXERCISES.filter((e) =>
    e.locais.includes(prefs.local) &&
    e.nivel.includes(prefs.nivel) &&
    e.objetivo.includes(prefs.objetivo) &&
    !restricoes.includes(e.regiao) &&
    !excluir.includes(e.slug) &&
    (equip.length === 0 || equip.includes(e.equipamento))
  );
}

function matchPapel(e: CuratedExercise, slot: Slot): boolean {
  if (slot.papel === 'any') return true;
  if (slot.papel === 'composto') return e.composto;
  return !e.composto;
}

// Escolhe um candidato priorizando os equipamentos favoritos; usa rotação
// determinística para variar exercícios entre dias que repetem a mesma região.
function pick(cands: CuratedExercise[], preferencias: string[] | undefined, rot: number): CuratedExercise {
  const pref = preferencias && preferencias.length
    ? cands.filter((c) => preferencias.includes(c.equipamento))
    : [];
  const list = pref.length ? pref : cands;
  return list[rot % list.length];
}

function toGenerated(e: CuratedExercise, prefs: GeneratorPreferences): GeneratedExercise {
  return {
    slug: e.slug,
    nome: e.nome,
    grupoMuscular: e.grupoMuscular,
    regiao: e.regiao,
    equipamento: e.equipamento,
    series: series(prefs.nivel, e.composto),
    repeticoes: repeticoes(prefs.objetivo, e.composto),
    descanso: descanso(prefs.objetivo, e.composto),
  };
}

function buildDay(
  blueprint: DayBlueprint,
  pool: CuratedExercise[],
  prefs: GeneratorPreferences,
  dayIndex: number,
  max: number
): GeneratedExercise[] {
  const used = new Set<string>();
  const out: GeneratedExercise[] = [];

  const take = (e: CuratedExercise) => {
    used.add(e.slug);
    out.push(toGenerated(e, prefs));
  };

  blueprint.slots.forEach((slot, slotIndex) => {
    if (out.length >= max) return;
    // 1) candidatos exatos (região + papel)
    let cands = pool.filter((e) => e.regiao === slot.regiao && matchPapel(e, slot) && !used.has(e.slug));
    // 2) relaxa o papel se necessário
    if (!cands.length) cands = pool.filter((e) => e.regiao === slot.regiao && !used.has(e.slug));
    if (!cands.length) return;
    take(pick(cands, prefs.preferencias, dayIndex * 7 + slotIndex));
  });

  // Fallback: se o dia ficou curto (ex.: treino em casa), completa APENAS com
  // outras regiões do próprio foco do dia. Nunca puxa exercício de fora do foco
  // (evita "supino" no dia de pernas). Se não houver candidatos do foco, o dia
  // fica mais curto — melhor do que contaminar a divisão.
  if (out.length < Math.min(max, 4)) {
    const focoRegioes = new Set(blueprint.slots.map((s) => s.regiao));
    const extras = pool.filter((e) => focoRegioes.has(e.regiao) && !used.has(e.slug));
    for (const e of extras) {
      if (out.length >= Math.min(max, 4)) break;
      take(e);
    }
  }

  return out;
}

export function generatePlan(prefs: GeneratorPreferences): GeneratedPlan {
  const dias = Math.max(2, Math.min(6, Math.round(prefs.dias)));
  const split = chooseSplit(prefs.nivel, dias);
  const pool = buildPool(prefs);
  const max = maxExercicios(prefs.tempo);
  const cardio = cardioNota(prefs.objetivo, prefs.nivel);

  const treinos: GeneratedDay[] = [];
  const rotuloCount: Record<string, number> = {};

  for (let i = 0; i < dias; i++) {
    const blueprint = split.ciclo[i % split.ciclo.length];
    const exercicios = buildDay(blueprint, pool, prefs, i, max);

    // Desambigua rótulos repetidos (ex.: dois "Push" no PPL de 6 dias).
    rotuloCount[blueprint.rotulo] = (rotuloCount[blueprint.rotulo] ?? 0) + 1;
    const suffix = rotuloCount[blueprint.rotulo] > 1 ? ` ${rotuloCount[blueprint.rotulo]}` : '';
    const isLetter = /^[A-F]$/.test(blueprint.rotulo);
    const nome = isLetter
      ? `Treino ${blueprint.rotulo}${suffix} — ${blueprint.foco}`
      : `${blueprint.rotulo}${suffix} — ${blueprint.foco}`;

    treinos.push({ nome, foco: blueprint.foco, exercicios, cardio });
  }

  const objLabel = prefs.objetivo === 'hipertrofia' ? 'Hipertrofia' : 'Emagrecimento';
  const nivelLabel = prefs.nivel === 'iniciante' ? 'Iniciante' : prefs.nivel === 'intermediario' ? 'Intermediário' : 'Avançado';

  return {
    titulo: `${split.divisao} · ${objLabel} · ${nivelLabel}`,
    divisao: split.divisao,
    objetivo: prefs.objetivo,
    nivel: prefs.nivel,
    dias,
    tempoPorTreino: prefs.tempo,
    treinos,
  };
}
