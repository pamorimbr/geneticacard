export enum Classification {
  X_DOMINANTE = 'Alossômica Ligada ao X Dominante',
  X_RECESSIVA = 'Alossômica Ligada ao X Recessiva',
  AUTO_RECESSIVA = 'Monogênica Autossômica Recessiva',
  AUTO_DOMINANTE = 'Monogênica Autossômica Dominante',
}

export interface Disease {
  id: string;
  name: string;
  classification: Classification;
}

export interface CardState {
  diseaseId: string;
  streak: number; // 0 to 3
  isMastered: boolean;
}

export interface Syndrome {
  id: string;
  name: string;
  features: string[]; // Array de parágrafos/pontos chaves
}

export interface GameState {
  cards: CardState[];
  currentCardId: string | null;
  lastAnswerResult: 'correct' | 'incorrect' | null;
  totalAttempts: number;
}