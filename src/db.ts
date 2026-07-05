import fs from 'fs';
import path from 'path';

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
  repetitions: string; // e.g. "10-12" or "8"
  rest_time: string; // e.g. "01:45"
  weight: number; // in kg
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_id: string;
  workout_name: string;
  date: string; // e.g., "2026-07-04"
  duration: number; // in minutes
  calories: number;
  notes: string;
  created_at: string;
}

export interface DatabaseState {
  exercises: Exercise[];
  workouts: Workout[];
  workout_exercises: WorkoutExercise[];
  workout_logs: WorkoutLog[];
  user: {
    name: string;
    weight: number;
    body_fat: number;
    active_minutes: number;
    streak: number;
  };
}

const DB_FILE = path.join(process.cwd(), 'db.json');

// Helper to generate IDs
function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

// Pre-populated seed data
const initialExercises: Exercise[] = [
  {
    id: "ex-supino",
    name_pt: "Supino Reto",
    name_en: "Bench Press",
    muscle_group: "Peito, Tríceps, Ombros",
    description_pt: "Deite-se no banco com os pés firmemente apoiados no chão. Segure a barra com uma abertura ligeiramente maior que a largura dos ombros. Desça a barra lentamente até a altura do peito, mantendo uma leve curvatura na região lombar. Empurre a barra de volta até que os braços estejam totalmente estendidos, mas sem travar os cotovelos. Mantenha o core engajado e as escápulas retraídas.",
    description_en: "Lie flat on a bench with feet flat on the floor. Hold the barbell with a grip slightly wider than shoulder-width. Lower the bar slowly to chest level, keeping a slight lumbar curve. Push the bar back up until arms are fully extended but without locking elbows.",
    created_at: new Date().toISOString()
  },
  {
    id: "ex-agachamento",
    name_pt: "Agachamento com Barra",
    name_en: "Barbell Squat",
    muscle_group: "Quadríceps, Glúteos, Posterior",
    description_pt: "Apoie a barra nos ombros (trapézio). Mantenha os pés afastados na largura dos ombros, abdômen contraído e coluna neutra. Agache descendo os quadris como se estivesse sentando em uma cadeira, até as coxas ficarem paralelas ao chão (ou abaixo). Empurre através dos calcanhares para retornar à posição inicial.",
    description_en: "Rest the bar on your upper traps. Keep feet shoulder-width apart, core engaged and spine neutral. Squat down by lowering hips as if sitting back into a chair until thighs are parallel to the floor. Push through heels to return to start.",
    created_at: new Date().toISOString()
  },
  {
    id: "ex-militar",
    name_pt: "Desenvolvimento Militar",
    name_en: "Overhead Press",
    muscle_group: "Ombros, Tríceps, Core",
    description_pt: "Fique em pé com a barra apoiada na parte superior do peito. Segure-a na largura dos ombros. Contraia o abdômen e os glúteos e empurre a barra para cima, estendendo os braços diretamente acima da cabeça. Desça de forma controlada.",
    description_en: "Stand with the barbell resting on your upper chest, hands shoulder-width. Contract core and glutes, then press the bar straight overhead. Lower with control.",
    created_at: new Date().toISOString()
  },
  {
    id: "ex-triceps",
    name_pt: "Tríceps Pulley",
    name_en: "Triceps Pushdown",
    muscle_group: "Tríceps",
    description_pt: "De frente para o cabo, segure a barra ou corda com os cotovelos fixados nas laterais do corpo. Estenda os cotovelos empurrando a carga para baixo de forma controlada até estender totalmente os braços. Retorne lentamente.",
    description_en: "Face the pulley machine, grab the bar/rope with elbows pinned to your sides. Extend elbows, pushing the weight down with control until arms are straight. Return slowly.",
    created_at: new Date().toISOString()
  },
  {
    id: "ex-terra",
    name_pt: "Levantamento Terra",
    name_en: "Deadlift",
    muscle_group: "Costas, Pernas, Posterior, Glúteos",
    description_pt: "Fique em pé com os pés abaixo da barra. Agache mantendo a coluna reta e segure a barra. Suba estendendo os quadris e joelhos simultaneamente, mantendo a barra bem próxima ao corpo. Termine ereto sem hiperextender a lombar.",
    description_en: "Stand with feet under the bar. Squat with flat back and grip the bar. Lift by extending hips and knees together, keeping the bar close to your body.",
    created_at: new Date().toISOString()
  },
  {
    id: "ex-rosca",
    name_pt: "Rosca Direta",
    name_en: "Bicep Curl",
    muscle_group: "Bíceps, Antebraços",
    description_pt: "Fique em pé com um halter em cada mão ou barra. Mantenha os cotovelos próximos ao corpo e flexione os braços, trazendo o peso em direção aos ombros. Desça de forma lenta e controlada.",
    description_en: "Stand with weights in hand, palms forward. Keep elbows close to torso, curl the weights up toward shoulders. Lower with control.",
    created_at: new Date().toISOString()
  }
];

const initialWorkouts: Workout[] = [
  {
    id: "w-push",
    name: "Push Day",
    user_id: "user-alex",
    created_at: new Date().toISOString()
  },
  {
    id: "w-pull",
    name: "Pull Day",
    user_id: "user-alex",
    created_at: new Date().toISOString()
  },
  {
    id: "w-legs",
    name: "Legs Day",
    user_id: "user-alex",
    created_at: new Date().toISOString()
  }
];

const initialWorkoutExercises: WorkoutExercise[] = [
  // Push Day
  {
    id: "we-1",
    workout_id: "w-push",
    exercise_id: "ex-agachamento",
    series: 3,
    repetitions: "10 — 12",
    rest_time: "02:00",
    weight: 90
  },
  {
    id: "we-2",
    workout_id: "w-push",
    exercise_id: "ex-supino",
    series: 4,
    repetitions: "10 — 12",
    rest_time: "01:45",
    weight: 80
  },
  {
    id: "we-3",
    workout_id: "w-push",
    exercise_id: "ex-militar",
    series: 3,
    repetitions: "10 — 12",
    rest_time: "01:30",
    weight: 50
  },
  {
    id: "we-4",
    workout_id: "w-push",
    exercise_id: "ex-triceps",
    series: 3,
    repetitions: "12 — 15",
    rest_time: "01:00",
    weight: 30
  },
  // Pull Day
  {
    id: "we-5",
    workout_id: "w-pull",
    exercise_id: "ex-terra",
    series: 4,
    repetitions: "8 — 10",
    rest_time: "02:30",
    weight: 120
  },
  {
    id: "we-6",
    workout_id: "w-pull",
    exercise_id: "ex-rosca",
    series: 3,
    repetitions: "10 — 12",
    rest_time: "01:15",
    weight: 16
  }
];

const initialLogs: WorkoutLog[] = [
  {
    id: "log-1",
    user_id: "user-alex",
    workout_id: "w-push",
    workout_name: "Treino de Empurrar",
    date: "Ontem", // Displaying yesterday, e.g. for matching UI
    duration: 45,
    calories: 320,
    notes: "Senti uma excelente conexão mente-músculo no supino reto. Consegui progredir 2kg na última série.",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "log-2",
    user_id: "user-alex",
    workout_id: "w-pull",
    workout_name: "Treino de Puxar",
    date: "Segunda-feira",
    duration: 50,
    calories: 410,
    notes: "Levantamento terra bem pesado, core muito firme. Bíceps bem fadigados no final.",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "log-3",
    user_id: "user-alex",
    workout_id: "w-legs",
    workout_name: "Treino de Pernas",
    date: "Sáb",
    duration: 60,
    calories: 580,
    notes: "Agachamento profundo com boa amplitude. Próxima semana tentar subir carga.",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export class Database {
  private state: DatabaseState;

  constructor() {
    this.state = {
      exercises: initialExercises,
      workouts: initialWorkouts,
      workout_exercises: initialWorkoutExercises,
      workout_logs: initialLogs,
      user: {
        name: "Alex",
        weight: 78.5,
        body_fat: 14.2,
        active_minutes: 420,
        streak: 5
      }
    };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        this.state = { ...this.state, ...parsed };
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Error loading database:", e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error saving database:", e);
    }
  }

  // --- Exercises API ---
  getExercises(): Exercise[] {
    return this.state.exercises;
  }

  getExerciseById(id: string): Exercise | undefined {
    return this.state.exercises.find(e => e.id === id);
  }

  addExercise(exercise: Omit<Exercise, 'id' | 'created_at'>): Exercise {
    const newEx: Exercise = {
      ...exercise,
      id: "ex-" + generateId(),
      created_at: new Date().toISOString()
    };
    this.state.exercises.push(newEx);
    this.save();
    return newEx;
  }

  updateExercise(id: string, updates: Partial<Omit<Exercise, 'id' | 'created_at'>>): Exercise | undefined {
    const ex = this.state.exercises.find(e => e.id === id);
    if (!ex) return undefined;
    Object.assign(ex, updates);
    this.save();
    return ex;
  }

  deleteExercise(id: string): boolean {
    const index = this.state.exercises.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.state.exercises.splice(index, 1);
    // clean up workout exercises using this
    this.state.workout_exercises = this.state.workout_exercises.filter(we => we.exercise_id !== id);
    this.save();
    return true;
  }

  // --- Workouts API ---
  getWorkouts(): Workout[] {
    return this.state.workouts;
  }

  addWorkout(name: string): Workout {
    const newW: Workout = {
      id: "w-" + generateId(),
      name,
      user_id: "user-alex",
      created_at: new Date().toISOString()
    };
    this.state.workouts.push(newW);
    this.save();
    return newW;
  }

  updateWorkout(id: string, name: string): Workout | undefined {
    const w = this.state.workouts.find(work => work.id === id);
    if (!w) return undefined;
    w.name = name;
    this.save();
    return w;
  }

  deleteWorkout(id: string): boolean {
    const index = this.state.workouts.findIndex(w => w.id === id);
    if (index === -1) return false;
    this.state.workouts.splice(index, 1);
    // clean up workout exercises
    this.state.workout_exercises = this.state.workout_exercises.filter(we => we.workout_id !== id);
    this.save();
    return true;
  }

  // --- Workout Exercises API ---
  getWorkoutExercises(): WorkoutExercise[] {
    return this.state.workout_exercises;
  }

  getWorkoutExercisesForWorkout(workoutId: string): WorkoutExercise[] {
    return this.state.workout_exercises.filter(we => we.workout_id === workoutId);
  }

  addWorkoutExercise(we: Omit<WorkoutExercise, 'id'>): WorkoutExercise {
    const newWe: WorkoutExercise = {
      ...we,
      id: "we-" + generateId()
    };
    this.state.workout_exercises.push(newWe);
    this.save();
    return newWe;
  }

  updateWorkoutExercise(id: string, updates: Partial<Omit<WorkoutExercise, 'id' | 'workout_id' | 'exercise_id'>>): WorkoutExercise | undefined {
    const item = this.state.workout_exercises.find(we => we.id === id);
    if (!item) return undefined;
    Object.assign(item, updates);
    this.save();
    return item;
  }

  deleteWorkoutExercise(id: string): boolean {
    const index = this.state.workout_exercises.findIndex(we => we.id === id);
    if (index === -1) return false;
    this.state.workout_exercises.splice(index, 1);
    this.save();
    return true;
  }

  // --- Workout Logs API ---
  getWorkoutLogs(): WorkoutLog[] {
    return this.state.workout_logs;
  }

  addWorkoutLog(log: Omit<WorkoutLog, 'id' | 'created_at'>): WorkoutLog {
    const newLog: WorkoutLog = {
      ...log,
      id: "log-" + generateId(),
      created_at: new Date().toISOString()
    };
    this.state.workout_logs.unshift(newLog); // Put most recent at top

    // Dynamically update user stats to match progress
    this.state.user.active_minutes += log.duration;
    // Keep active minutes updated
    this.save();
    return newLog;
  }

  // --- User Profile API ---
  getUserProfile() {
    return this.state.user;
  }

  updateUserProfile(updates: Partial<DatabaseState['user']>) {
    Object.assign(this.state.user, updates);
    this.save();
    return this.state.user;
  }
}

// Global DB instance
export const db = new Database();
