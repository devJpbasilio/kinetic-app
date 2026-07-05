export interface Exercise {
  id: string;
  name_pt: string;
  name_en: string;
  muscle_group: string;
  description_pt: string;
  description_en: string;
  created_at: string;
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
  body_fat: number;
  active_minutes: number;
  streak: number;
}
