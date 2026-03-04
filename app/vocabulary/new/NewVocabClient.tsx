// app/vocabulary/new/NewVocabClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import VocabForm from "@/components/VocabForm";
import { createCategory } from "@/lib/actions/categories";
import { createVocabulary } from "@/lib/actions/vocabulary";
import type { Category } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";

export default function NewVocabClient({
  categories: initialCategories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  const [vocabError, setVocabError] = useState("");
  const [categories, setCategories] = useState(initialCategories);

  const category = categories.find((c) => c.id === categoryId);

  async function handleSubmit(data: VocabFormData) {
    setVocabError("");
    try {
      await createVocabulary({
        japanese: data.japanese,
        chinese: data.chinese,
        exampleJp: data.exampleJp,
        categoryId: category ? category.id : null,
      });
      router.push("/vocabulary");
    } catch {
      setVocabError("新增失敗，請再試一次");
    }
  }

  async function handleCreateCategory(name: string) {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">新增單字</h1>
        <p className="text-stone-500 text-sm mt-1">
          {category
            ? `加入「${category.name}」分類`
            : "加入新的單字到你的單字庫"}
        </p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        {vocabError && (
          <p className="text-destructive text-sm mb-4">{vocabError}</p>
        )}
        <VocabForm
          categories={categories}
          onSubmit={handleSubmit}
          onCreateCategory={handleCreateCategory}
          submitLabel="新增單字"
        />
      </div>
    </div>
  );
}
