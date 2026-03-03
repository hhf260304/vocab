'use client'

import { useRouter } from 'next/navigation'
import { useVocabStore } from '@/lib/store'
import { VocabFormData } from '@/lib/types'
import VocabForm from '@/components/VocabForm'

export default function NewVocabPage() {
  const router = useRouter()
  const addVocabulary = useVocabStore((s) => s.addVocabulary)

  function handleSubmit(data: VocabFormData) {
    addVocabulary(data)
    router.push('/vocabulary')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新增單字</h1>
        <p className="text-gray-500 text-sm mt-1">加入新的日文單字到你的單字庫</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <VocabForm onSubmit={handleSubmit} submitLabel="新增單字" />
      </div>
    </div>
  )
}
