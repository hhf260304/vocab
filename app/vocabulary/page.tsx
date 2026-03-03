'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useVocabStore } from '@/lib/store'
import VocabCard from '@/components/VocabCard'

export default function VocabularyPage() {
  const { vocabularies, categories, deleteVocabulary } = useVocabStore()
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

  const filtered = vocabularies.filter((v) => {
    const matchSearch =
      !search ||
      v.japanese.includes(search) ||
      v.kana.includes(search) ||
      v.chinese.includes(search)
    const matchCat = !selectedCat || v.categoryIds.includes(selectedCat)
    return matchSearch && matchCat
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">單字庫</h1>
        <Link
          href="/vocabulary/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          + 新增單字
        </Link>
      </div>

      <input
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        placeholder="搜尋日文、假名、中文..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCat(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              !selectedCat ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border-2 ${
                selectedCat === cat.id ? 'text-white border-transparent' : 'border-gray-200 bg-white text-gray-600'
              }`}
              style={selectedCat === cat.id ? { backgroundColor: cat.color } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">{vocabularies.length === 0 ? '還沒有單字' : '找不到符合的單字'}</p>
          </div>
        ) : (
          filtered.map((vocab) => (
            <VocabCard
              key={vocab.id}
              vocab={vocab}
              categories={categories}
              onDelete={() => {
                if (confirm(`確定刪除「${vocab.japanese}」？`)) {
                  deleteVocabulary(vocab.id)
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
