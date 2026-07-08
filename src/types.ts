export interface AccountUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved';
  created_at: string;
}

export interface Exercise {
  id: string;
  name_pt: string;
  name_en: string;
  muscle_group: string;
  description_pt: string;
  description_en: string;
  created_at: string;
  /** URL do ícone do músculo-alvo (vindo do catálogo externo) */
  image_muscle?: string;
  /** URL do ícone do equipamento (vindo do catálogo externo) */
  image_equipment?: string;
  /** Imagem de demonstração do exercício (thumbnail do vídeo) */
  image_demo?: string;
  /** URL do vídeo de demonstração (YouTube) */
  video_url?: string;
}

export interface Workout {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  series: number;
  repetitions: string;
  rest_time: string;
  weight: number;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_id: string;
  workout_name: string;
  date: string;
  duration: number;
  calories: number;
  notes: string;
  created_at: string;
}

export interface UserProfile {
  name: string;
  weight: number;
  /** Altura em cm */
  height?: number;
  body_fat: number;
  /** Índice de Massa Corporal, calculado a partir de peso e altura */
  bmi?: number;
  /** E-mail da conta (presente após login) */
  email?: string;
  /** Papel da conta: 'admin' pode aprovar/remover usuários */
  role?: 'admin' | 'user';
  /** Minutos ativos na semana atual (calculado a partir dos logs) */
  active_minutes: number;
  /** Dias consecutivos de treino (calculado a partir dos logs) */
  streak: number;
  /** Treinos concluídos na semana atual (calculado a partir dos logs) */
  weekly_workouts: number;
}
