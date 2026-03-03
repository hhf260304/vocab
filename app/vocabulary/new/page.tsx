'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVocabStore } from '@/lib/store'
import { VocabFormData } from '@/lib/types'
import VocabForm from '@/components/VocabForm'

function NewVocabPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('categoryId')
  const { addVocabulary, categories } = useVocabStore()
  const category = categories.find((c) => c.id === categoryId)

  function handleSubmit(data: VocabFormData) {
    addVocabulary({
      ...data,
      categoryIds: category ? [category.id] : [],
    })
    router.push('/vocabulary')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">新增單字</h1>
        <p className="text-stone-500 text-sm mt-1">
          {category ? `加入「${category.name}」分類` : '加入新的日文單字到你的單字庫'}
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <VocabForm onSubmit={handleSubmit} submitLabel="新增單字" />
      </div>
    </div>
  )
}

export default function NewVocabPage() {
  return (
    <Suspense fallback={null}>
      <NewVocabPageInner />
    </Suspense>
  )
}
