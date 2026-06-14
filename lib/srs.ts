const INTERVALS_DAYS = [3, 7, 14, 30]

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
    return { stage: 0, nextReviewAt: addDays(1) }
  }
  if (stage >= INTERVALS_DAYS.length) {
    return { stage, nextReviewAt: '9999-12-31' }
  }
  return { stage: stage + 1, nextReviewAt: addDays(INTERVALS_DAYS[stage]) }
}

export function isDueToday(nextReviewAt: string): boolean {
  return nextReviewAt !== '9999-12-31' && nextReviewAt <= todayStr()
}
