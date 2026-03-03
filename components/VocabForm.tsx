'use client'

import { useState, useEffect } from 'react'
import { useVocabStore } from '@/lib/store'
import { VocabFormData } from '@/lib/types'
import CategoryTag from './CategoryTag'

interface Props {
  initialData?: VocabFormData & { id?: string }
  onSubmit: (data: VocabFormData) => void
  submitLabel: string
}

const PRESET_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
]

export default function VocabForm({ initialData, onSubmit, submitLabel }: Props) {
  const { categories, addCategory, deleteCategory } = useVocabStore()

  const [form, setForm] = useState<VocabFormData>({
    japanese: '',
    kana: '',
    chinese: '',
    exampleJp: '',
    exampleZh: '',
    categoryIds: [],
    ...initialData,
  })

  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])

  useEffect(() => {
    if (initialData) setForm((f) => ({ ...f, ...initialData }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id])

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    speechSynthesis.speak(utterance)
  }

  function setField(field: keyof VocabFormData, value: string | string[]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleCategory(id: string) {
    setField(
      'categoryIds',
      form.categoryIds.includes(id)
        ? form.categoryIds.filter((c) => c !== id)
        : [...form.categoryIds, id]
    )
  }

  function handleAddCategory() {
    if (!newCatName.trim()) return
    addCategory(newCatName.trim(), newCatColor)
    setNewCatName('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.japanese || !form.kana || !form.chinese) return
    onSubmit(form)
  }

  const inputClass = 'w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">日文（漢字）*</label>
        <input
          className={inputClass}
          value={form.japanese}
          onChange={(e) => setField('japanese', e.target.value)}
          placeholder="例：食べる"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">假名（讀音）*</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={form.kana}
            onChange={(e) => setField('kana', e.target.value)}
            placeholder="例：たべる"
            required
          />
          <button
            type="button"
            onClick={() => speak(form.kana)}
            className="px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-lg"
            title="朗讀"
          >
            🔊
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">中文意思 *</label>
        <input
          className={inputClass}
          value={form.chinese}
          onChange={(e) => setField('chinese', e.target.value)}
          placeholder="例：吃"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">例句（日文）</label>
        <input
          className={inputClass}
          value={form.exampleJp}
          onChange={(e) => setField('exampleJp', e.target.value)}
          placeholder="例：ご飯を食べる。"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">例句（中文）</label>
        <input
          className={inputClass}
          value={form.exampleZh}
          onChange={(e) => setField('exampleZh', e.target.value)}
          placeholder="例：吃飯。"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">分類</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-all ${
                form.categoryIds.includes(cat.id)
                  ? 'border-transparent text-white'
                  : 'border-stone-200 bg-white text-stone-600'
              }`}
              style={form.categoryIds.includes(cat.id) ? { backgroundColor: cat.color } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <input
            className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="新增分類..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewCatColor(color)}
                className={`w-6 h-6 rounded-full transition-transform ${newCatColor === color ? 'scale-125 ring-2 ring-offset-1 ring-stone-400' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddCategory}
            className="px-3 py-2 bg-orange-700 text-white rounded-xl text-sm font-medium hover:bg-orange-800"
          >
            新增
          </button>
        </div>

        {categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {categories.map((cat) => (
              <CategoryTag
                key={cat.id}
                category={cat}
                onDelete={() => deleteCategory(cat.id)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-orange-700 text-white rounded-xl font-semibold hover:bg-orange-800 transition-colors mt-2"
      >
        {submitLabel}
      </button>
    </form>
  )
}
