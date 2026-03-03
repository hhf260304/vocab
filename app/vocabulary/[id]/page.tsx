'use client'

import { useRouter, useParams } from 'next/navigation'
import { useVocabStore } from '@/lib/store'
import { VocabFormData } from '@/lib/types'
import VocabForm from '@/components/VocabForm'

export default function EditVocabPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { vocabularies, updateVocabulary } = useVocabStore()
  const vocab = vocabularies.find((v) => v.id === id)

  if (!vocab) {
    return <p className="text-gray-500">找不到單字</p>
  }

  function handleSubmit(data: VocabFormData) {
    updateVocabulary(id, data)
    router.push('/vocabulary')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">編輯單字</h1>
        <p className="text-gray-500 text-sm mt-1">修改 {vocab.japanese} 的資料</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <VocabForm
          initialData={vocab}
          onSubmit={handleSubmit}
          submitLabel="儲存變更"
        />
      </div>
    </div>
  )
}
