'use client'

import Link from 'next/link'
import { useVocabStore } from '@/lib/store'
import StatsCard from '@/components/StatsCard'
import CategoryBar from '@/components/CategoryBar'

export default function DashboardPage() {
  const { vocabularies, getTodayReviews } = useVocabStore()
  const todayReviews = getTodayReviews()
  const graduated = vocabularies.filter((v) => v.reviewStage === 5).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">今日複習</h1>
        <p className="text-stone-500 text-sm mt-1">保持每日練習，記憶更牢固</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatsCard label="待複習" value={todayReviews.length} highlight />
        <StatsCard label="總單字" value={vocabularies.length} />
        <StatsCard label="已畢業" value={graduated} />
      </div>

      <Link
        href="/review"
        className={`w-full py-4 rounded-2xl text-center font-semibold text-lg transition-colors ${
          todayReviews.length > 0
            ? 'bg-orange-700 text-white hover:bg-orange-800'
            : 'bg-stone-200 text-stone-400 pointer-events-none'
        }`}
      >
        {todayReviews.length > 0 ? `開始複習（${todayReviews.length} 個）` : '今日無待複習單字'}
      </Link>

      <CategoryBar />

      {vocabularies.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">還沒有單字</p>
          <Link href="/vocabulary/new" className="text-orange-700 text-sm mt-1 inline-block hover:underline">
            新增第一個單字 →
          </Link>
        </div>
      )}
    </div>
  )
}
