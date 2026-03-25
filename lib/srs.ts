// Wait times (ms) applied when reviewing stage N: INTERVALS_MS[N] schedules stage N+1.
// Stage 5 → stage 6 (graduation) returns Infinity directly — no entry needed for it.
const INTERVALS_MS = [
  1  * 24 * 60 * 60 * 1000, // stage 0 → 1
  3  * 24 * 60 * 60 * 1000, // stage 1 → 2
  7  * 24 * 60 * 60 * 1000, // stage 2 → 3
  14 * 24 * 60 * 60 * 1000, // stage 3 → 4
  30 * 24 * 60 * 60 * 1000, // stage 4 → 5 (30-day wait before graduation review)
]

export function getNextReviewAt(stage: number, remembered: boolean): { stage: number; nextReviewAt: number } {
  if (!remembered) {
    return {
      stage: 0,
      nextReviewAt: Date.now() + INTERVALS_MS[0],
    }
  }
  const nextStage = Math.min(stage + 1, 6) as 0 | 1 | 2 | 3 | 4 | 5 | 6
  if (nextStage === 6) {
    return { stage: 6, nextReviewAt: Infinity }
  }
  const next = new Date(Date.now() + INTERVALS_MS[stage])
  next.setHours(0, 0, 0, 0)
  return {
    stage: nextStage,
    nextReviewAt: next.getTime(),
  }
}

export function isDueToday(nextReviewAt: number): boolean {
  return nextReviewAt !== Infinity && nextReviewAt <= Date.now()
}
