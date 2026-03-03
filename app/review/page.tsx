'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useVocabStore } from '@/lib/store'
import FlashCard from '@/components/FlashCard'

export default function ReviewPage() {
  const router = useRouter()
  const { getTodayReviews, markReview } = useVocabStore()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queue = useMemo(() => getTodayReviews(), [])
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<{ remembered: number; forgot: number }>({ remembered: 0, forgot: 0 })
  const [done, setDone] = useState(false)

  const current = queue[index]
  const total = queue.length

  function handleAnswer(remembered: boolean) {
    markReview(current.id, remembered)
    setResults((r) => ({
      remembered: r.remembered + (remembered ? 1 : 0),
      forgot: r.forgot + (remembered ? 0 : 1),
    }))

    if (index + 1 >= total) {
      setDone(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="text-xl font-bold text-stone-900">今日沒有待複習單字</h2>
        <button onClick={() => router.push('/')} className="text-orange-700 hover:underline text-sm">
          回到首頁
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <p className="text-5xl">✅</p>
        <h2 className="text-2xl font-bold text-stone-900">複習完成！</h2>
        <div className="flex gap-6">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-emerald-600">{results.remembered}</span>
            <span className="text-sm text-stone-500">記得</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-red-500">{results.forgot}</span>
            <span className="text-sm text-stone-500">忘記</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-orange-700 text-white rounded-2xl font-semibold hover:bg-orange-800 transition-colors"
        >
          回到首頁
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-stone-400">進度</span>
          <span className="font-bold text-stone-700">{index + 1} / {total}</span>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          離開
        </button>
      </div>

      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-stone-800 rounded-full transition-all duration-300"
          style={{ width: `${((index) / total) * 100}%` }}
        />
      </div>

      <FlashCard
        key={current.id}
        vocab={current}
        onRemembered={() => handleAnswer(true)}
        onForgot={() => handleAnswer(false)}
      />
    </div>
  )
}
