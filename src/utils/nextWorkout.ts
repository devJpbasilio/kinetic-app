import { Workout, WorkoutLog } from '../types';

/**
 * Determina o próximo treino da rotação a partir do histórico.
 *
 * A rotação segue a ordem da lista `workouts` (ordem de criação vinda do back).
 * `logs` deve vir ordenado do mais recente para o mais antigo — o primeiro log
 * cujo treino ainda existe define "onde paramos", e devolvemos o treino seguinte,
 * dando a volta ao chegar no fim (rotação cíclica).
 *
 * Regras de borda:
 * - Sem treinos → null.
 * - Sem histórico (ou só logs de treinos já excluídos) → primeiro treino.
 */
export function getNextWorkout(workouts: Workout[], logs: WorkoutLog[]): Workout | null {
  if (workouts.length === 0) return null;

  const lastLog = logs.find((log) => workouts.some((w) => w.id === log.workout_id));
  if (!lastLog) return workouts[0];

  const lastIdx = workouts.findIndex((w) => w.id === lastLog.workout_id);
  return workouts[(lastIdx + 1) % workouts.length];
}
