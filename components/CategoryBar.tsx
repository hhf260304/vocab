'use client'

import { useVocabStore } from '@/lib/store'

export default function CategoryBar() {
  const { vocabularies, categories } = useVocabStore()

  if (categories.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">分類進度</h2>
      <div className="flex flex-col gap-3">
        {categories.map((cat) => {
          const catVocabs = vocabularies.filter((v) => v.categoryIds.includes(cat.id))
          const graduated = catVocabs.filter((v) => v.reviewStage === 5).length
          const total = catVocabs.length
          const pct = total === 0 ? 0 : Math.round((graduated / total) * 100)

          return (
            <div key={cat.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{cat.name}</span>
                <span className="text-gray-400">{graduated}/{total}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
