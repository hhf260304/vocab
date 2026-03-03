'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useVocabStore } from '@/lib/store'
import VocabCard from '@/components/VocabCard'
import { Vocabulary, Category } from '@/lib/types'

function CategorySection({
  cat,
  name,
  vocabs,
  categories,
  onDelete,
  onDeleteCategory,
}: {
  cat?: Category
  name: string
  vocabs: Vocabulary[]
  categories: Category[]
  onDelete: (id: string) => void
  onDeleteCategory?: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <span className="font-semibold text-stone-800">{name}</span>
          <span className="text-sm text-stone-400">{vocabs.length} 個單字</span>
          <span className="text-stone-400 text-xs ml-auto">{collapsed ? '▶' : '▼'}</span>
        </button>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          {cat && (
            <Link
              href={`/vocabulary/new?categoryId=${cat.id}`}
              className="px-3 py-1 text-xs font-medium bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition-colors"
            >
              + 單字
            </Link>
          )}
          {cat && onDeleteCategory && (
            <button
              onClick={() => onDeleteCategory(cat.id)}
              className="px-2 py-1 text-xs text-stone-400 hover:text-red-500 transition-colors"
              title={`刪除分類「${name}」`}
            >
              ×
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-px border-t border-stone-100">
          {vocabs.length === 0 ? (
            <p className="text-sm text-stone-400 px-5 py-4">還沒有單字，點「+ 單字」開始新增</p>
          ) : (
            vocabs.map((vocab) => (
              <div key={vocab.id} className="px-2 py-1">
                <VocabCard
                  vocab={vocab}
                  categories={categories}
                  onDelete={() => onDelete(vocab.id)}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function VocabularyPage() {
  const { vocabularies, categories, deleteVocabulary, addCategory, deleteCategory } = useVocabStore()
  const [search, setSearch] = useState('')
  const [showCatInput, setShowCatInput] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const filtered = vocabularies.filter((v) => {
    if (!search) return true
    return v.japanese.includes(search) || v.chinese.includes(search)
  })

  function handleDelete(id: string) {
    const vocab = vocabularies.find((v) => v.id === id)
    if (vocab && confirm(`確定刪除「${vocab.japanese}」？`)) {
      deleteVocabulary(id)
    }
  }

  function handleDeleteCategory(id: string) {
    const cat = categories.find((c) => c.id === id)
    if (cat && confirm(`確定刪除分類「${cat.name}」？分類內的單字將變為未分類。`)) {
      deleteCategory(id)
    }
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return
    addCategory(newCatName.trim())
    setNewCatName('')
    setShowCatInput(false)
  }

  const groups = categories.map((cat) => ({
    cat,
    vocabs: filtered.filter((v) => v.categoryIds.includes(cat.id)),
  }))

  const uncategorized = filtered.filter((v) => v.categoryIds.length === 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">單字庫</h1>
        <button
          onClick={() => setShowCatInput((s) => !s)}
          className="px-4 py-2 bg-orange-700 text-white rounded-xl text-sm font-semibold hover:bg-orange-800 transition-colors"
        >
          + 新增分類
        </button>
      </div>

      {showCatInput && (
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            autoFocus
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            placeholder="分類名稱..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setShowCatInput(false)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-orange-700 text-white rounded-xl text-sm font-semibold hover:bg-orange-800"
          >
            建立
          </button>
          <button
            type="button"
            onClick={() => setShowCatInput(false)}
            className="px-3 py-2 text-stone-400 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm"
          >
            取消
          </button>
        </form>
      )}

      {categories.length > 0 && (
        <input
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          placeholder="搜尋日文、中文..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {categories.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-4xl mb-3">📂</p>
          <p className="font-medium">先新增分類，再加入單字</p>
          <p className="text-sm mt-1">點右上角「+ 新增分類」開始</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ cat, vocabs }) => (
            <CategorySection
              key={cat.id}
              cat={cat}
              name={cat.name}
              vocabs={vocabs}
              categories={categories}
              onDelete={handleDelete}
              onDeleteCategory={handleDeleteCategory}
            />
          ))}
          {uncategorized.length > 0 && (
            <CategorySection
              name="未分類"
              vocabs={uncategorized}
              categories={categories}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}
    </div>
  )
}
