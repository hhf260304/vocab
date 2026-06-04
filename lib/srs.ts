const INTERVALS_DAYS = [1, 3, 7, 14, 30]

function toDateStr(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(d)
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function getNextReviewAt(stage: number, remembered: boolean): { stage: number; nextReviewAt: string } {
  if (!remembered) {
    return { stage: 0, nextReviewAt: addDays(INTERVALS_DAYS[0]) }
  }
  const nextStage = Math.min(stage + 1, 6) as 0 | 1 | 2 | 3 | 4 | 5 | 6
  if (nextStage === 6) {
    return { stage: 6, nextReviewAt: '9999-12-31' }
  }
  return { stage: nextStage, nextReviewAt: addDays(INTERVALS_DAYS[stage]) }
}

export function isDueToday(nextReviewAt: string): boolean {
  return nextReviewAt !== '9999-12-31' && nextReviewAt <= todayStr()
}
