// Base curada de exercícios com metadados (fonte principal do motor).
// Cada item já carrega nível, objetivo, equipamento e local — é o que permite
// ao app trocar/gerar exercícios automaticamente de forma previsível.
//
// Convenções de "locais":
//   academia_completa → tudo
//   academia_basica   → barra, halteres, peso corporal, máquinas/polias básicas
//   casa              → peso corporal, halteres, elástico

import { CuratedExercise, Nivel, Objetivo, Local, Equipamento, Regiao } from './types';

const TODOS_NIVEIS: Nivel[] = ['iniciante', 'intermediario', 'avancado'];
const TODOS_OBJ: Objetivo[] = ['hipertrofia', 'emagrecimento'];
const ACADEMIA: Local[] = ['academia_completa', 'academia_basica'];
const SO_COMPLETA: Local[] = ['academia_completa'];
const CASA_ACADEMIA: Local[] = ['academia_completa', 'academia_basica', 'casa'];

interface Opts {
  nivel?: Nivel[];
  objetivo?: Objetivo[];
  locais?: Local[];
}

function ex(
  slug: string,
  nome: string,
  name_en: string,
  grupoMuscular: string,
  regiao: Regiao,
  equipamento: Equipamento,
  composto: boolean,
  opts: Opts = {}
): CuratedExercise {
  return {
    slug,
    nome,
    name_en,
    grupoMuscular,
    regiao,
    equipamento,
    composto,
    nivel: opts.nivel ?? TODOS_NIVEIS,
    objetivo: opts.objetivo ?? TODOS_OBJ,
    locais: opts.locais ?? ACADEMIA,
  };
}

export const CURATED_EXERCISES: CuratedExercise[] = [
  // ---------------- PEITO ----------------
  ex('supino-reto-maquina', 'Supino Reto Máquina', 'Machine Chest Press', 'Peito, Tríceps', 'peito', 'Máquina', true, { locais: ACADEMIA }),
  ex('supino-reto', 'Supino Reto', 'Barbell Bench Press', 'Peito, Tríceps, Ombros', 'peito', 'Barra', true, { nivel: ['intermediario', 'avancado'] }),
  ex('supino-reto-halteres', 'Supino Reto com Halteres', 'Dumbbell Bench Press', 'Peito, Tríceps', 'peito', 'Halteres', true, { locais: CASA_ACADEMIA }),
  ex('supino-inclinado', 'Supino Inclinado', 'Incline Barbell Press', 'Peito Superior, Ombros', 'peito', 'Barra', true, { nivel: ['intermediario', 'avancado'] }),
  ex('supino-inclinado-halteres', 'Supino Inclinado com Halteres', 'Incline Dumbbell Press', 'Peito Superior', 'peito', 'Halteres', true, { locais: CASA_ACADEMIA }),
  ex('supino-inclinado-maquina', 'Supino Inclinado Máquina', 'Incline Machine Press', 'Peito Superior', 'peito', 'Máquina', true, { locais: ACADEMIA }),
  ex('crucifixo', 'Crucifixo com Halteres', 'Dumbbell Fly', 'Peito', 'peito', 'Halteres', false, { locais: CASA_ACADEMIA }),
  ex('crossover', 'Crossover na Polia', 'Cable Crossover', 'Peito', 'peito', 'Cabo', false, { locais: SO_COMPLETA }),
  ex('flexao', 'Flexão de Braço', 'Push-up', 'Peito, Tríceps', 'peito', 'Peso Corporal', true, { locais: CASA_ACADEMIA }),

  // ---------------- COSTAS ----------------
  ex('puxada-frontal', 'Puxada Frontal', 'Lat Pulldown', 'Costas, Bíceps', 'costas', 'Máquina', true, { locais: ACADEMIA }),
  ex('barra-fixa', 'Barra Fixa', 'Pull-up', 'Costas, Bíceps', 'costas', 'Peso Corporal', true, { nivel: ['intermediario', 'avancado'], locais: CASA_ACADEMIA }),
  ex('remada-curvada', 'Remada Curvada', 'Barbell Row', 'Costas, Posterior de Ombro', 'costas', 'Barra', true, { nivel: ['intermediario', 'avancado'] }),
  ex('remada-baixa', 'Remada Baixa', 'Seated Cable Row', 'Costas, Bíceps', 'costas', 'Cabo', true, { locais: ACADEMIA }),
  ex('remada-maquina', 'Remada Máquina', 'Machine Row', 'Costas', 'costas', 'Máquina', true, { locais: ACADEMIA }),
  ex('remada-unilateral', 'Remada Unilateral com Halter', 'One-Arm Dumbbell Row', 'Costas', 'costas', 'Halteres', true, { locais: CASA_ACADEMIA }),
  ex('pulldown', 'Pulldown na Polia', 'Straight-Arm Pulldown', 'Costas (Dorsais)', 'costas', 'Cabo', false, { locais: SO_COMPLETA }),
  ex('levantamento-terra', 'Levantamento Terra', 'Deadlift', 'Costas, Pernas, Glúteos', 'costas', 'Barra', true, { nivel: ['avancado'] }),

  // ---------------- OMBRO ----------------
  ex('desenvolvimento-maquina', 'Desenvolvimento Máquina', 'Machine Shoulder Press', 'Ombros', 'ombro', 'Máquina', true, { locais: ACADEMIA }),
  ex('desenvolvimento-halteres', 'Desenvolvimento com Halteres', 'Dumbbell Shoulder Press', 'Ombros, Tríceps', 'ombro', 'Halteres', true, { locais: CASA_ACADEMIA }),
  ex('desenvolvimento-militar', 'Desenvolvimento Militar', 'Overhead Press', 'Ombros, Tríceps', 'ombro', 'Barra', true, { nivel: ['intermediario', 'avancado'] }),
  ex('elevacao-lateral', 'Elevação Lateral', 'Lateral Raise', 'Ombros (Lateral)', 'ombro', 'Halteres', false, { locais: CASA_ACADEMIA }),
  ex('elevacao-frontal', 'Elevação Frontal', 'Front Raise', 'Ombros (Anterior)', 'ombro', 'Halteres', false, { locais: CASA_ACADEMIA }),
  ex('face-pull', 'Face Pull', 'Face Pull', 'Ombros (Posterior), Trapézio', 'ombro', 'Cabo', false, { locais: SO_COMPLETA }),

  // ---------------- TRAPÉZIO ----------------
  ex('encolhimento', 'Encolhimento com Halteres', 'Dumbbell Shrug', 'Trapézio', 'trapezio', 'Halteres', false, { locais: CASA_ACADEMIA }),

  // ---------------- BÍCEPS ----------------
  ex('rosca-direta', 'Rosca Direta', 'Barbell Curl', 'Bíceps', 'biceps', 'Barra', false, { locais: ACADEMIA }),
  ex('rosca-alternada', 'Rosca Alternada', 'Alternating Dumbbell Curl', 'Bíceps', 'biceps', 'Halteres', false, { locais: CASA_ACADEMIA }),
  ex('rosca-martelo', 'Rosca Martelo', 'Hammer Curl', 'Bíceps, Antebraço', 'biceps', 'Halteres', false, { locais: CASA_ACADEMIA }),
  ex('rosca-scott', 'Rosca Scott', 'Preacher Curl', 'Bíceps', 'biceps', 'Máquina', false, { locais: ACADEMIA }),
  ex('rosca-polia', 'Rosca na Polia', 'Cable Curl', 'Bíceps', 'biceps', 'Cabo', false, { locais: SO_COMPLETA }),

  // ---------------- TRÍCEPS ----------------
  ex('triceps-corda', 'Tríceps Corda', 'Triceps Rope Pushdown', 'Tríceps', 'triceps', 'Cabo', false, { locais: ACADEMIA }),
  ex('triceps-testa', 'Tríceps Testa', 'Skullcrusher', 'Tríceps', 'triceps', 'Barra', false, { nivel: ['intermediario', 'avancado'] }),
  ex('triceps-frances', 'Tríceps Francês', 'Overhead Dumbbell Extension', 'Tríceps', 'triceps', 'Halteres', false, { locais: CASA_ACADEMIA }),
  ex('triceps-maquina', 'Tríceps Máquina', 'Machine Triceps Extension', 'Tríceps', 'triceps', 'Máquina', false, { locais: ACADEMIA }),
  ex('paralelas', 'Paralelas (Mergulho)', 'Parallel Bar Dips', 'Tríceps, Peito', 'triceps', 'Peso Corporal', true, { nivel: ['intermediario', 'avancado'], locais: CASA_ACADEMIA }),

  // ---------------- QUADRÍCEPS ----------------
  ex('agachamento-livre', 'Agachamento Livre', 'Barbell Squat', 'Quadríceps, Glúteos', 'quadriceps', 'Barra', true, { nivel: ['intermediario', 'avancado'] }),
  ex('leg-press', 'Leg Press', 'Leg Press', 'Quadríceps, Glúteos', 'quadriceps', 'Máquina', true, { locais: ACADEMIA }),
  ex('cadeira-extensora', 'Cadeira Extensora', 'Leg Extension', 'Quadríceps', 'quadriceps', 'Máquina', false, { locais: ACADEMIA }),
  ex('hack-machine', 'Hack Machine', 'Hack Squat', 'Quadríceps, Glúteos', 'quadriceps', 'Máquina', true, { nivel: ['intermediario', 'avancado'], locais: SO_COMPLETA }),
  ex('afundo', 'Afundo (Passada)', 'Dumbbell Lunge', 'Quadríceps, Glúteos', 'quadriceps', 'Halteres', true, { locais: CASA_ACADEMIA }),
  ex('agachamento-livre-peso', 'Agachamento Peso Corporal', 'Bodyweight Squat', 'Quadríceps, Glúteos', 'quadriceps', 'Peso Corporal', true, { locais: CASA_ACADEMIA }),

  // ---------------- POSTERIOR DE COXA ----------------
  ex('mesa-flexora', 'Mesa Flexora', 'Lying Leg Curl', 'Posterior de Coxa', 'posterior', 'Máquina', false, { locais: ACADEMIA }),
  ex('cadeira-flexora', 'Cadeira Flexora', 'Seated Leg Curl', 'Posterior de Coxa', 'posterior', 'Máquina', false, { locais: ACADEMIA }),
  ex('stiff', 'Stiff', 'Stiff-Leg Deadlift', 'Posterior de Coxa, Glúteos', 'posterior', 'Barra', true, { nivel: ['intermediario', 'avancado'] }),
  ex('stiff-halteres', 'Stiff com Halteres', 'Dumbbell Romanian Deadlift', 'Posterior de Coxa, Glúteos', 'posterior', 'Halteres', true, { locais: CASA_ACADEMIA }),

  // ---------------- GLÚTEOS ----------------
  ex('elevacao-pelvica', 'Elevação Pélvica', 'Hip Thrust', 'Glúteos', 'gluteo', 'Barra', true, { locais: ACADEMIA }),
  ex('cadeira-abdutora', 'Cadeira Abdutora', 'Hip Abduction', 'Glúteos (Médio)', 'gluteo', 'Máquina', false, { locais: ACADEMIA }),
  ex('coice-polia', 'Coice na Polia', 'Cable Kickback', 'Glúteos', 'gluteo', 'Cabo', false, { locais: SO_COMPLETA }),
  ex('gluteo-quatro-apoios', 'Glúteo 4 Apoios', 'Glute Kickback', 'Glúteos', 'gluteo', 'Peso Corporal', false, { locais: CASA_ACADEMIA }),

  // ---------------- PANTURRILHA ----------------
  ex('panturrilha-em-pe', 'Panturrilha em Pé', 'Standing Calf Raise', 'Panturrilhas', 'panturrilha', 'Máquina', false, { locais: ACADEMIA }),
  ex('panturrilha-sentado', 'Panturrilha Sentado', 'Seated Calf Raise', 'Panturrilhas', 'panturrilha', 'Máquina', false, { locais: ACADEMIA }),
  ex('panturrilha-peso', 'Panturrilha em Pé (livre)', 'Bodyweight Calf Raise', 'Panturrilhas', 'panturrilha', 'Peso Corporal', false, { locais: CASA_ACADEMIA }),

  // ---------------- ABDÔMEN ----------------
  ex('abdomen-maquina', 'Abdômen Máquina', 'Machine Crunch', 'Abdômen', 'abdomen', 'Máquina', false, { locais: ACADEMIA }),
  ex('prancha', 'Prancha', 'Plank', 'Abdômen, Core', 'abdomen', 'Peso Corporal', false, { locais: CASA_ACADEMIA }),
  ex('abdominal-supra', 'Abdominal Supra', 'Crunch', 'Abdômen', 'abdomen', 'Peso Corporal', false, { locais: CASA_ACADEMIA }),
  ex('elevacao-pernas', 'Elevação de Pernas', 'Hanging Leg Raise', 'Abdômen Inferior', 'abdomen', 'Peso Corporal', false, { locais: CASA_ACADEMIA }),
  ex('abdominal-polia', 'Abdominal na Polia', 'Cable Crunch', 'Abdômen', 'abdomen', 'Cabo', false, { locais: SO_COMPLETA }),

  // ---------------- ELÁSTICO (foco em treino em casa) ----------------
  ex('flexao-elastico', 'Flexão com Elástico', 'Banded Push-up', 'Peito, Tríceps', 'peito', 'Elástico', true, { locais: CASA_ACADEMIA }),
  ex('crucifixo-elastico', 'Crucifixo com Elástico', 'Band Chest Fly', 'Peito', 'peito', 'Elástico', false, { locais: CASA_ACADEMIA }),
  ex('remada-elastico', 'Remada com Elástico', 'Band Row', 'Costas, Bíceps', 'costas', 'Elástico', true, { locais: CASA_ACADEMIA }),
  ex('puxada-elastico', 'Puxada com Elástico', 'Band Lat Pulldown', 'Costas', 'costas', 'Elástico', true, { locais: CASA_ACADEMIA }),
  ex('desenvolvimento-elastico', 'Desenvolvimento com Elástico', 'Band Shoulder Press', 'Ombros', 'ombro', 'Elástico', true, { locais: CASA_ACADEMIA }),
  ex('elevacao-lateral-elastico', 'Elevação Lateral com Elástico', 'Band Lateral Raise', 'Ombros (Lateral)', 'ombro', 'Elástico', false, { locais: CASA_ACADEMIA }),
  ex('face-pull-elastico', 'Face Pull com Elástico', 'Band Face Pull', 'Ombros (Posterior), Trapézio', 'trapezio', 'Elástico', false, { locais: CASA_ACADEMIA }),
  ex('rosca-elastico', 'Rosca com Elástico', 'Band Biceps Curl', 'Bíceps', 'biceps', 'Elástico', false, { locais: CASA_ACADEMIA }),
  ex('triceps-elastico', 'Tríceps com Elástico', 'Band Triceps Pushdown', 'Tríceps', 'triceps', 'Elástico', false, { locais: CASA_ACADEMIA }),
  ex('agachamento-elastico', 'Agachamento com Elástico', 'Banded Squat', 'Quadríceps, Glúteos', 'quadriceps', 'Elástico', true, { locais: CASA_ACADEMIA }),
  ex('stiff-elastico', 'Stiff com Elástico', 'Band Romanian Deadlift', 'Posterior de Coxa, Glúteos', 'posterior', 'Elástico', true, { locais: CASA_ACADEMIA }),
  ex('coice-elastico', 'Coice com Elástico', 'Band Glute Kickback', 'Glúteos', 'gluteo', 'Elástico', false, { locais: CASA_ACADEMIA }),
  ex('abducao-elastico', 'Abdução com Elástico', 'Band Hip Abduction', 'Glúteos (Médio)', 'gluteo', 'Elástico', false, { locais: CASA_ACADEMIA }),
  ex('panturrilha-elastico', 'Panturrilha com Elástico', 'Band Calf Raise', 'Panturrilhas', 'panturrilha', 'Elástico', false, { locais: CASA_ACADEMIA }),

  // ---------------- KETTLEBELL ----------------
  ex('supino-kettlebell', 'Supino com Kettlebell', 'Kettlebell Floor Press', 'Peito, Tríceps', 'peito', 'Kettlebell', true, { locais: CASA_ACADEMIA }),
  ex('remada-kettlebell', 'Remada com Kettlebell', 'Kettlebell Row', 'Costas, Bíceps', 'costas', 'Kettlebell', true, { locais: CASA_ACADEMIA }),
  ex('desenvolvimento-kettlebell', 'Desenvolvimento com Kettlebell', 'Kettlebell Press', 'Ombros, Tríceps', 'ombro', 'Kettlebell', true, { locais: CASA_ACADEMIA }),
  ex('elevacao-lateral-kettlebell', 'Elevação Lateral com Kettlebell', 'Kettlebell Lateral Raise', 'Ombros (Lateral)', 'ombro', 'Kettlebell', false, { locais: CASA_ACADEMIA }),
  ex('rosca-kettlebell', 'Rosca com Kettlebell', 'Kettlebell Curl', 'Bíceps', 'biceps', 'Kettlebell', false, { locais: CASA_ACADEMIA }),
  ex('triceps-kettlebell', 'Tríceps Francês com Kettlebell', 'Kettlebell Overhead Extension', 'Tríceps', 'triceps', 'Kettlebell', false, { locais: CASA_ACADEMIA }),
  ex('goblet-squat', 'Agachamento Goblet', 'Kettlebell Goblet Squat', 'Quadríceps, Glúteos', 'quadriceps', 'Kettlebell', true, { locais: CASA_ACADEMIA }),
  ex('swing-kettlebell', 'Kettlebell Swing', 'Kettlebell Swing', 'Glúteos, Posterior de Coxa', 'gluteo', 'Kettlebell', true, { locais: CASA_ACADEMIA }),
  ex('stiff-kettlebell', 'Stiff com Kettlebell', 'Kettlebell Romanian Deadlift', 'Posterior de Coxa, Glúteos', 'posterior', 'Kettlebell', true, { locais: CASA_ACADEMIA }),
  ex('encolhimento-kettlebell', 'Encolhimento com Kettlebell', 'Kettlebell Shrug', 'Trapézio', 'trapezio', 'Kettlebell', false, { locais: CASA_ACADEMIA }),
  ex('panturrilha-kettlebell', 'Panturrilha com Kettlebell', 'Kettlebell Calf Raise', 'Panturrilhas', 'panturrilha', 'Kettlebell', false, { locais: CASA_ACADEMIA }),
];

// Índice slug → exercício (usado pelo servidor para persistir os treinos gerados).
export const CURATED_BY_SLUG: Record<string, CuratedExercise> = Object.fromEntries(
  CURATED_EXERCISES.map((e) => [e.slug, e])
);
