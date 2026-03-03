'use client'

import { useState, useEffect } from 'react'
import { VocabFormData } from '@/lib/types'

interface Props {
  initialData?: VocabFormData & { id?: string }
  onSubmit: (data: VocabFormData) => void
  submitLabel: string
}

export default function VocabForm({ initialData, onSubmit, submitLabel }: Props) {
  // categoryIds is carried through state but has no UI.
  // new/page.tsx overrides it from the URL param on submit.
  // [id]/page.tsx relies on it round-tripping unchanged from initialData.
  const [form, setForm] = useState<VocabFormData>({
    japanese: '',
    chinese: '',
    exampleJp: '',
    categoryIds: [],
    ...initialData,
  })

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.japanese || !form.chinese) return
    onSubmit(form)
  }

  const inputClass = 'w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">日文 *</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={form.japanese}
            onChange={(e) => setField('japanese', e.target.value)}
            placeholder="例：食べる"
            required
          />
          <button
            type="button"
            onClick={() => speak(form.japanese)}
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

      <button
        type="submit"
        className="w-full py-3 bg-orange-700 text-white rounded-xl font-semibold hover:bg-orange-800 transition-colors mt-2"
      >
        {submitLabel}
      </button>
    </form>
  )
}
