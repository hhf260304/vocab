const INTERVALS_MS = [
  1 * 24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  28 * 24 * 60 * 60 * 1000,
]

export function getNextReviewAt(stage: number, remembered: boolean): { stage: number; nextReviewAt: number } {
  if (!remembered) {
    return {
      stage: 0,
      nextReviewAt: Date.now() + INTERVALS_MS[0],
    }
  }
  const nextStage = Math.min(stage + 1, 5) as 0 | 1 | 2 | 3 | 4 | 5
  if (nextStage === 5) {
    return { stage: 5, nextReviewAt: Infinity }
  }
  return {
    stage: nextStage,
    nextReviewAt: Date.now() + INTERVALS_MS[nextStage],
  }
}

export function isDueToday(nextReviewAt: number): boolean {
  return nextReviewAt !== Infinity && nextReviewAt <= Date.now()
}
