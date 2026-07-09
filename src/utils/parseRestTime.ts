// Converte um tempo de descanso "MM:SS" (ex.: "01:30") em segundos totais.
// Extraído de ActiveWorkoutView para permitir teste unitário e corrigir o bug
// do parse com `|| default` (0 é falsy → "00:30" virava 90s).
//
// Regras:
//  - aceita "M:SS", "MM:SS" e também só minutos ("2" → 120s);
//  - partes ausentes/invalidas contam como 0;
//  - resultado nunca é negativo; se tudo for inválido, cai no fallback (padrão 90s).
export function parseRestTime(rest: string | null | undefined, fallbackSeconds = 90): number {
  if (typeof rest !== 'string') return fallbackSeconds;
  const parts = rest.split(':');

  const toInt = (v: string | undefined): number | null => {
    if (v === undefined) return null;
    const n = parseInt(v.trim(), 10);
    return Number.isNaN(n) ? null : n;
  };

  const mins = toInt(parts[0]);
  const secs = toInt(parts[1]);

  // Nenhum número reconhecido → fallback explícito (não silencioso).
  if (mins === null && secs === null) return fallbackSeconds;

  const total = (mins ?? 0) * 60 + (secs ?? 0);
  return total > 0 ? total : fallbackSeconds;
}
