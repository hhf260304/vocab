// lib/types.ts
export interface Vocabulary {
  id: string;
  front: string;
  back: string;
  exampleJp: string;
  categoryId: string | null;
  languageId: string | null;
  createdAt: number;
  reviewStage: 0 | 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number;
  lastReviewedAt?: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Language {
  id: string;
  name: string;
  ttsCode: string;
  defaultSide: "front" | "back";
}

export type VocabFormData = {
  front: string;
  back: string;
  exampleJp: string;
  categoryId: string | null;
  languageId: string | null;
};
