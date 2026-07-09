// Blueprints de divisão (splits) + seleção do split conforme nível e dias.
// Cada dia é uma sequência ordenada de "slots" (região + papel). O motor
// preenche cada slot com o melhor exercício da base curada, respeitando o
// tempo disponível (número de exercícios) e as preferências do usuário.

import { Nivel, Regiao } from './types';

export type Papel = 'composto' | 'isolado' | 'any';

export interface Slot {
  regiao: Regiao;
  papel: Papel;
}

export interface DayBlueprint {
  rotulo: string; // "A", "Superior", "Push"...
  foco: string;   // rótulo legível do foco do dia
  slots: Slot[];  // ordenados: compostos primeiro
}

export interface SplitDef {
  divisao: string;       // nome exibido da divisão
  ciclo: DayBlueprint[]; // ciclo base (repetido para preencher os dias)
}

const s = (regiao: Regiao, papel: Papel = 'any'): Slot => ({ regiao, papel });

// ---------------- Full Body ----------------
const FULLBODY: SplitDef = {
  divisao: 'Full Body',
  ciclo: [
    {
      rotulo: 'A',
      foco: 'Corpo Inteiro',
      slots: [
        s('quadriceps', 'composto'), s('peito', 'composto'), s('costas', 'composto'),
        s('ombro', 'any'), s('posterior', 'isolado'), s('biceps', 'isolado'),
        s('triceps', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
    {
      rotulo: 'B',
      foco: 'Corpo Inteiro',
      slots: [
        s('quadriceps', 'composto'), s('costas', 'composto'), s('peito', 'composto'),
        s('ombro', 'isolado'), s('posterior', 'isolado'), s('panturrilha', 'isolado'),
        s('biceps', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
  ],
};

// ---------------- Upper / Lower ----------------
const UPPER_LOWER: SplitDef = {
  divisao: 'Upper / Lower',
  ciclo: [
    {
      rotulo: 'Superior',
      foco: 'Membros Superiores',
      slots: [
        s('peito', 'composto'), s('costas', 'composto'), s('ombro', 'composto'),
        s('costas', 'any'), s('peito', 'isolado'), s('biceps', 'isolado'),
        s('triceps', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
    {
      rotulo: 'Inferior',
      foco: 'Membros Inferiores',
      slots: [
        s('quadriceps', 'composto'), s('gluteo', 'composto'), s('posterior', 'isolado'),
        s('quadriceps', 'isolado'), s('posterior', 'isolado'), s('panturrilha', 'isolado'),
        s('panturrilha', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
  ],
};

// ---------------- Push / Pull / Legs ----------------
const PPL: SplitDef = {
  divisao: 'Push Pull Legs',
  ciclo: [
    {
      rotulo: 'Push',
      foco: 'Peito, Ombro, Tríceps',
      slots: [
        s('peito', 'composto'), s('peito', 'composto'), s('ombro', 'composto'),
        s('ombro', 'isolado'), s('triceps', 'isolado'), s('triceps', 'isolado'),
        s('peito', 'isolado'),
      ],
    },
    {
      rotulo: 'Pull',
      foco: 'Costas, Bíceps',
      slots: [
        s('costas', 'composto'), s('costas', 'composto'), s('costas', 'any'),
        s('ombro', 'isolado'), s('biceps', 'isolado'), s('biceps', 'isolado'),
        s('trapezio', 'isolado'),
      ],
    },
    {
      rotulo: 'Legs',
      foco: 'Pernas Completo',
      slots: [
        s('quadriceps', 'composto'), s('quadriceps', 'composto'), s('gluteo', 'composto'),
        s('posterior', 'isolado'), s('quadriceps', 'isolado'), s('panturrilha', 'isolado'),
        s('panturrilha', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
  ],
};

// ---------------- ABC ----------------
const ABC: SplitDef = {
  divisao: 'ABC',
  ciclo: [
    {
      rotulo: 'A',
      foco: 'Peito, Ombro, Tríceps',
      slots: [
        s('peito', 'composto'), s('peito', 'composto'), s('ombro', 'composto'),
        s('ombro', 'isolado'), s('triceps', 'isolado'), s('triceps', 'isolado'),
        s('peito', 'isolado'),
      ],
    },
    {
      rotulo: 'B',
      foco: 'Costas, Bíceps',
      slots: [
        s('costas', 'composto'), s('costas', 'composto'), s('costas', 'any'),
        s('costas', 'isolado'), s('biceps', 'isolado'), s('biceps', 'isolado'),
        s('trapezio', 'isolado'),
      ],
    },
    {
      rotulo: 'C',
      foco: 'Pernas',
      slots: [
        s('quadriceps', 'composto'), s('quadriceps', 'composto'), s('gluteo', 'composto'),
        s('posterior', 'isolado'), s('quadriceps', 'isolado'), s('panturrilha', 'isolado'),
        s('panturrilha', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
  ],
};

// ---------------- ABCD ----------------
const ABCD: SplitDef = {
  divisao: 'ABCD',
  ciclo: [
    {
      rotulo: 'A',
      foco: 'Peito, Tríceps',
      slots: [
        s('peito', 'composto'), s('peito', 'composto'), s('peito', 'isolado'),
        s('triceps', 'isolado'), s('triceps', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
    {
      rotulo: 'B',
      foco: 'Costas, Bíceps',
      slots: [
        s('costas', 'composto'), s('costas', 'composto'), s('costas', 'any'),
        s('biceps', 'isolado'), s('biceps', 'isolado'), s('trapezio', 'isolado'),
      ],
    },
    {
      rotulo: 'C',
      foco: 'Pernas',
      slots: [
        s('quadriceps', 'composto'), s('quadriceps', 'composto'), s('gluteo', 'composto'),
        s('posterior', 'isolado'), s('panturrilha', 'isolado'), s('panturrilha', 'isolado'),
      ],
    },
    {
      rotulo: 'D',
      foco: 'Ombro, Abdômen',
      slots: [
        s('ombro', 'composto'), s('ombro', 'isolado'), s('ombro', 'isolado'),
        s('trapezio', 'isolado'), s('abdomen', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
  ],
};

// ---------------- ABCDEF ----------------
const ABCDEF: SplitDef = {
  divisao: 'ABCDEF',
  ciclo: [
    {
      rotulo: 'A',
      foco: 'Peito',
      slots: [
        s('peito', 'composto'), s('peito', 'composto'), s('peito', 'composto'),
        s('peito', 'isolado'), s('peito', 'isolado'), s('triceps', 'isolado'),
      ],
    },
    {
      rotulo: 'B',
      foco: 'Costas',
      slots: [
        s('costas', 'composto'), s('costas', 'composto'), s('costas', 'composto'),
        s('costas', 'isolado'), s('trapezio', 'isolado'), s('biceps', 'isolado'),
      ],
    },
    {
      rotulo: 'C',
      foco: 'Pernas (Quadríceps)',
      slots: [
        s('quadriceps', 'composto'), s('quadriceps', 'composto'), s('quadriceps', 'composto'),
        s('quadriceps', 'isolado'), s('panturrilha', 'isolado'), s('panturrilha', 'isolado'),
      ],
    },
    {
      rotulo: 'D',
      foco: 'Ombro',
      slots: [
        s('ombro', 'composto'), s('ombro', 'composto'), s('ombro', 'isolado'),
        s('ombro', 'isolado'), s('trapezio', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
    {
      rotulo: 'E',
      foco: 'Braços',
      slots: [
        s('biceps', 'isolado'), s('biceps', 'isolado'), s('biceps', 'isolado'),
        s('triceps', 'isolado'), s('triceps', 'isolado'), s('triceps', 'isolado'),
      ],
    },
    {
      rotulo: 'F',
      foco: 'Posterior, Glúteos',
      slots: [
        s('posterior', 'isolado'), s('posterior', 'isolado'), s('gluteo', 'composto'),
        s('gluteo', 'isolado'), s('panturrilha', 'isolado'), s('abdomen', 'isolado'),
      ],
    },
  ],
};

// Seleciona a divisão conforme nível e dias, seguindo a matriz do produto.
export function chooseSplit(nivel: Nivel, dias: number): SplitDef {
  const d = Math.max(2, Math.min(6, dias));
  if (nivel === 'iniciante') {
    return d <= 3 ? FULLBODY : UPPER_LOWER;
  }
  if (nivel === 'intermediario') {
    if (d <= 3) return ABC;
    if (d === 4) return ABCD;
    return PPL; // 5, 6
  }
  // avançado
  if (d >= 6) return ABCDEF;
  return PPL; // 5
}
