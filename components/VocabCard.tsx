'use client'

import Link from 'next/link'
import { Vocabulary, Category } from '@/lib/types'
import CategoryTag from './CategoryTag'

interface Props {
  vocab: Vocabulary
  categories: Category[]
  onDelete: () => void
}

const STAGE_LABELS = ['新', '第1次', '第2次', '第3次', '第4次', '畢業']

export default function VocabCard({ vocab, categories, onDelete }: Props) {
  const vocabCategories = categories.filter((c) => vocab.categoryIds.includes(c.id))

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-stone-900">{vocab.japanese}</span>
          <span className="text-sm text-stone-400">{vocab.kana}</span>
          <span className="text-sm font-medium text-orange-700">{vocab.chinese}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
            {STAGE_LABELS[vocab.reviewStage]}
          </span>
          {vocabCategories.map((cat) => (
            <CategoryTag key={cat.id} category={cat} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href={`/vocabulary/${vocab.id}`}
          className="px-3 py-1.5 text-sm text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
        >
          編輯
        </Link>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
        >
          刪除
        </button>
      </div>
    </div>
  )
}
