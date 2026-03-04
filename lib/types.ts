export interface Vocabulary {
  id: string
  japanese: string
  chinese: string
  exampleJp: string
  categoryIds: string[]
  createdAt: number
  reviewStage: 0 | 1 | 2 | 3 | 4 | 5
  nextReviewAt: number
  lastReviewedAt?: number
}

export interface Category {
  id: string
  name: string
}

export type VocabFormData = Omit<Vocabulary, 'id' | 'createdAt' | 'reviewStage' | 'nextReviewAt' | 'lastReviewedAt'>
