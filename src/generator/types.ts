// Tipos do motor de geração de treinos inteligentes.
// Este módulo é usado APENAS no servidor (Node). O front-end apenas envia as
// preferências e renderiza o plano retornado pela API.

export type Nivel = 'iniciante' | 'intermediario' | 'avancado';
export type Objetivo = 'hipertrofia' | 'emagrecimento';
export type Genero = 'masculino' | 'feminino';
export type Local = 'academia_completa' | 'academia_basica' | 'casa';

// Equipamentos normalizados usados na base curada e no filtro do usuário.
export type Equipamento =
  | 'Barra'
  | 'Halteres'
  | 'Máquina'
  | 'Cabo'
  | 'Peso Corporal'
  | 'Elástico'
  | 'Kettlebell';

// Regiões musculares usadas para montar as divisões (splits).
export type Regiao =
  | 'peito'
  | 'costas'
  | 'ombro'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'posterior'
  | 'gluteo'
  | 'panturrilha'
  | 'abdomen'
  | 'trapezio';

// Exercício da base curada — carrega os metadados que permitem a troca automática.
export interface CuratedExercise {
  slug: string;
  nome: string;        // name_pt (nome usado nas academias do Brasil)
  name_en: string;
  grupoMuscular: string; // rótulo exibido (ex.: "Peito, Tríceps")
  regiao: Regiao;
  equipamento: Equipamento;
  composto: boolean;   // exercício composto (multiarticular) vs. isolado
  nivel: Nivel[];      // níveis para os quais é apropriado
  objetivo: Objetivo[];// objetivos para os quais é indicado
  locais: Local[];     // onde pode ser executado
}

// Preferências capturadas pelo wizard.
export interface GeneratorPreferences {
  objetivo: Objetivo;
  nivel: Nivel;
  dias: number;                  // 2 a 6
  tempo: 30 | 45 | 60 | 90;      // minutos por treino
  local: Local;
  equipamentos?: Equipamento[];  // filtro explícito (vazio = todos do local)
  restricoes?: Regiao[];         // regiões a evitar (lesões)
  excluir?: string[];            // slugs de exercícios proibidos
  preferencias?: Equipamento[];  // equipamentos favoritos (priorizados)
  seed?: number;                 // varia a seleção entre gerações (mesmo perfil)
  genero?: Genero;               // ajusta a ênfase de volume por grupo muscular
}

export interface GeneratedExercise {
  slug: string;
  nome: string;
  grupoMuscular: string;
  regiao: Regiao;
  equipamento: Equipamento;
  series: number;
  repeticoes: string; // ex.: "8 - 12"
  descanso: string;   // ex.: "01:30"
}

export interface GeneratedDay {
  nome: string;   // ex.: "Treino A — Peito / Ombro / Tríceps"
  foco: string;   // ex.: "Peito, Ombro, Tríceps"
  exercicios: GeneratedExercise[];
  cardio?: string; // observação de cardio/HIIT ao final, quando aplicável
}

export interface GeneratedPlan {
  titulo: string;
  divisao: string;        // ex.: "Push Pull Legs", "ABC", "Full Body"
  objetivo: Objetivo;
  nivel: Nivel;
  genero?: Genero;
  dias: number;
  tempoPorTreino: number;
  treinos: GeneratedDay[];
}
